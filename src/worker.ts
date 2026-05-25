import type { D1Database } from '@cloudflare/workers-types';

// ── Types ──────────────────────────────────────────────────────────

type Env = {
  DB: D1Database;
  GOOGLE_MAPS_API_KEY: string;
};

type OrderRow = {
  id: number;
  restaurant_id: string;
  table_number: string;
  items: number;
  total_mad: number;
  status: 'PENDING' | 'PREPARING' | 'CLAIMED' | 'SERVED' | 'PAID';
  server_id: string | null;
  order_items: string | null;
  source: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  delivery_instructions: string | null;
  driver_id: string | null;
  created_at: number;
};

type FrontendOrder = {
  id: string;
  table: string;
  items: number;
  total: number;
  status: string;
  time: number;
  source: string;
  serverId: string | null;
  driverId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  deliveryInstructions: string | null;
  orderItems: unknown[];
};

type UpdateBody = {
  orderId: string;
  newStatus?: string;
  serverId?: string | null;
  expectedOldStatus?: string;
};

type PlaceIdBody = {
  restaurantName?: string;
  city?: string;
  country?: string;
};

// ── Status mapping ─────────────────────────────────────────────────

const FE_STATUS: Record<string, string> = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  CLAIMED: 'ready',
  SERVED: 'served',
  PAID: 'paid',
};

const D1_STATUS: Record<string, string> = {
  pending: 'PENDING',
  preparing: 'PREPARING',
  ready: 'CLAIMED',
  served: 'SERVED',
  paid: 'PAID',
};

// ── Helpers ────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function error(msg: string, status: number): Response {
  return json({ error: msg }, status);
}

function mapRow(row: OrderRow): FrontendOrder {
  return {
    id: String(row.id),
    table: row.table_number,
    items: row.items,
    total: row.total_mad,
    status: FE_STATUS[row.status] ?? row.status.toLowerCase(),
    time: row.created_at * 1000,
    source: row.source ?? 'qr',
    serverId: row.server_id,
    driverId: null,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerAddress: row.customer_address,
    deliveryInstructions: row.delivery_instructions,
    orderItems: row.order_items ? JSON.parse(row.order_items) : [],
  };
}

// ── Handlers ───────────────────────────────────────────────────────

async function handleGetOrders(url: URL, env: Env): Promise<Response> {
  const restaurantId = url.searchParams.get('restaurantId');
  if (!restaurantId) return error('restaurantId is required', 400);

  const type = url.searchParams.get('type') || 'active';

  let sql: string;
  let bind: string[];

  if (type === 'history') {
    sql = `SELECT * FROM orders WHERE restaurant_id = ? AND status = 'PAID' ORDER BY created_at DESC`;
    bind = [restaurantId];
  } else {
    sql = `SELECT * FROM orders WHERE restaurant_id = ? AND status != 'PAID' ORDER BY created_at DESC`;
    bind = [restaurantId];
  }

  const { results } = await env.DB.prepare(sql).bind(...bind).all<OrderRow>();
  return json(results.map(mapRow));
}

async function handleUpdateOrder(request: Request, env: Env): Promise<Response> {
  let body: UpdateBody;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }
  if (!body.orderId) return error('orderId is required', 400);

  // Map frontend status → D1 status if newStatus is provided
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (body.newStatus) {
    const d1Status = D1_STATUS[body.newStatus];
    if (!d1Status) return error(`Unknown status: ${body.newStatus}`, 400);
    clauses.push('status = ?');
    values.push(d1Status);
  }

  if (body.serverId !== undefined) {
    clauses.push('server_id = ?');
    values.push(body.serverId);
  }

  clauses.push('updated_at = unixepoch()');

  if (clauses.length === 0) return error('Nothing to update', 400);

  const orderId = Number(body.orderId);
  if (isNaN(orderId)) return error('orderId must be a numeric string', 400);

  values.push(orderId);

  // Optimistic concurrency: only update if status matches expected
  const expectedStatus = body.expectedOldStatus
    ? D1_STATUS[body.expectedOldStatus]
    : undefined;

  if (expectedStatus) {
    values.push(expectedStatus);
  }

  const sql = `UPDATE orders SET ${clauses.join(', ')} WHERE id = ?${
    expectedStatus ? ' AND status = ?' : ''
  }`;

  const result = await env.DB.prepare(sql).bind(...values).run();

  if (result.meta.changes === 0) {
    const { results } = await env.DB.prepare(
      `SELECT id, status, server_id FROM orders WHERE id = ?`
    ).bind(orderId).all<OrderRow>();

    if (results.length === 0) return error('Order not found', 404);

    const current = results[0];
    return json(
      {
        code: 409,
        message: `Conflict: order ${orderId} has status "${current.status}", server "${current.server_id}"`,
        currentStatus: FE_STATUS[current.status] ?? current.status.toLowerCase(),
        currentServerId: current.server_id,
      },
      409,
    );
  }

  return json({ success: true });
}

async function handleAddOrder(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json<Record<string, unknown>>();
  } catch {
    return error('Invalid JSON body', 400);
  }

  const restaurantId = body.restaurantId as string | undefined;
  const table = body.table as string | undefined;
  const items = body.items as number | undefined;
  const total = body.total as number | undefined;
  const orderItems = body.orderItems as unknown[] | undefined;
  const source = (body.source as string) ?? 'qr';
  const customerName = body.customerName as string | null | undefined;
  const customerPhone = body.customerPhone as string | null | undefined;
  const customerAddress = body.customerAddress as string | null | undefined;
  const deliveryInstructions = body.deliveryInstructions as string | null | undefined;

  if (!restaurantId) return error('restaurantId is required', 400);
  if (table === undefined) return error('table is required', 400);
  if (items === undefined) return error('items is required', 400);
  if (total === undefined) return error('total is required', 400);

  const result = await env.DB.prepare(
    `INSERT INTO orders (restaurant_id, table_number, items, total_mad, status, order_items, source, customer_name, customer_phone, customer_address, delivery_instructions, created_at, updated_at) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`
  ).bind(
    restaurantId,
    String(table),
    items,
    total,
    orderItems ? JSON.stringify(orderItems) : null,
    source,
    customerName ?? null,
    customerPhone ?? null,
    customerAddress ?? null,
    deliveryInstructions ?? null,
  ).run();

  return json({ id: result.meta.last_row_id }, 201);
}

async function handleGetPlaceId(request: Request, env: Env): Promise<Response> {
  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return error('Google Maps API key not configured on the server', 500);

  let body: PlaceIdBody;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON', 400);
  }
  if (!body.restaurantName) return error('restaurantName is required', 400);

  const query = [body.restaurantName, body.city, body.country].filter(Boolean).join(' ');

  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id',
    },
    body: JSON.stringify({ textQuery: query }),
  });

  const data = await resp.json<{ places?: { id: string }[] }>();
  if (!data.places?.length) return error('No place found', 404);

  return json({ placeId: data.places[0].id });
}

// ── Router ─────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case '/api/orders':
          if (request.method === 'GET') return handleGetOrders(url, env);
          return error('Method not allowed', 405);

        case '/api/update-order':
          if (request.method === 'POST') return handleUpdateOrder(request, env);
          return error('Method not allowed', 405);

        case '/api/add-order':
          if (request.method === 'POST') return handleAddOrder(request, env);
          return error('Method not allowed', 405);

        case '/api/get-place-id':
          if (request.method !== 'POST') return error('Method not allowed', 405);
          return handleGetPlaceId(request, env);

        default:
          return error('Not found', 404);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal error';
      return error(msg, 500);
    }
  },
};
