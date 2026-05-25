-- ─────────────────────────────────────────────────────
-- D1 Database Schema for QR CRM SAAS (Orders)
-- ─────────────────────────────────────────────────────
-- Deploy:
--   npx wrangler d1 execute crm-db --file=schema.sql          (local/dev)
--   npx wrangler d1 execute crm-db --file=schema.sql --remote  (prod)
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id TEXT    NOT NULL,
  table_number  TEXT    NOT NULL,
  items         INTEGER NOT NULL DEFAULT 0,
  total_mad     REAL    NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'PENDING'
                        CHECK(status IN ('PENDING', 'CLAIMED', 'SERVED', 'PAID')),
  server_id     TEXT,
  order_items   TEXT,                   -- JSON array string
  source        TEXT    DEFAULT 'qr',
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  delivery_instructions TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index for restaurant-based queries
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
  ON orders(restaurant_id, status);

-- Index for server queries
CREATE INDEX IF NOT EXISTS idx_orders_server
  ON orders(server_id);
