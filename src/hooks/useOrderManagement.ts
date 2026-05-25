import { useState, useEffect, useRef, useCallback } from "react";
import type { Order } from "../dataStore";

// Set via VITE_API_URL env var, or default to local wrangler dev server
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

interface OptimisticOverride {
  status?: Order["status"];
  serverId?: string;
}

export interface UseOrderManagementOptions {
  restaurantId: string;
  staffId: string;
  pollIntervalMs?: number;
}

export interface UseOrderManagementReturn {
  orders: Order[];
  aServir: Order[];
  mesCommandes: Order[];
  payees: Order[];
  isLoading: boolean;
  claimOrder: (orderId: string) => Promise<void>;
  markServed: (orderId: string) => Promise<void>;
  markPaid: (orderId: string) => Promise<void>;
}

async function fetchOrders(restaurantId: string, type: "active" | "history"): Promise<Order[]> {
  const res = await fetch(
    `${API_BASE}/api/orders?restaurantId=${encodeURIComponent(restaurantId)}&type=${type}`
  );
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

async function updateOrder(
  orderId: string,
  newStatus: Order["status"],
  serverId?: string,
  expectedOldStatus?: Order["status"]
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/update-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId,
      newStatus,
      serverId: serverId ?? null,
      expectedOldStatus,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw Object.assign(new Error(body.message || "Update failed"), {
      data: body,
      status: res.status,
    });
  }
}

export function useOrderManagement({
  restaurantId,
  staffId,
  pollIntervalMs = 3000,
}: UseOrderManagementOptions): UseOrderManagementReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const optimisticRef = useRef<Map<string, OptimisticOverride>>(new Map());
  const rollbackRef = useRef<
    Map<string, { snapshot: Order; overrides: Map<string, OptimisticOverride> }>
  >(new Map());

  useEffect(() => {
    let mounted = true;
    let busy = false;

    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const [active, history] = await Promise.all([
          fetchOrders(restaurantId, "active"),
          fetchOrders(restaurantId, "history"),
        ]);
        if (!mounted) return;

        const merged = [...active, ...history].map((o) => {
          const override = optimisticRef.current.get(o.id);
          return override ? { ...o, ...override } : o;
        });
        setOrders(merged);
        setIsLoading(false);
      } catch {
        // Will retry on next tick
      } finally {
        busy = false;
      }
    };

    poll();
    const interval = setInterval(poll, pollIntervalMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [restaurantId, pollIntervalMs]);

  const applyOptimistic = useCallback((orderId: string, patch: OptimisticOverride) => {
    optimisticRef.current.set(orderId, {
      ...optimisticRef.current.get(orderId),
      ...patch,
    });
    const merged = optimisticRef.current.get(orderId);
    if (merged) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...merged } : o))
      );
    }
  }, []);

  const clearOptimistic = useCallback((orderId: string) => {
    optimisticRef.current.delete(orderId);
    rollbackRef.current.delete(orderId);
  }, []);

  const withRollback = useCallback(
    async (
      orderId: string,
      override: OptimisticOverride,
      action: () => Promise<void>
    ) => {
      const prevOrders = orders;
      const prevOptimistic = new Map(optimisticRef.current);
      applyOptimistic(orderId, override);
      try {
        await action();
        clearOptimistic(orderId);
      } catch (err: any) {
        optimisticRef.current = prevOptimistic;
        setOrders(prevOrders);
        const data = err?.data;
        const isConflict = data?.code === 409 || err?.status === 409;
        throw Object.assign(
          new Error(isConflict ? "CONFLICT" : "ORDER_UPDATE_FAILED"),
          { data, orderId, isConflict }
        );
      }
    },
    [orders, applyOptimistic, clearOptimistic]
  );

  const claimOrder = useCallback(
    (orderId: string) =>
      withRollback(orderId, { serverId: staffId }, () =>
        updateOrder(orderId, "ready", staffId, "pending")
      ),
    [staffId, withRollback]
  );

  const markServed = useCallback(
    (orderId: string) =>
      withRollback(orderId, { status: "served" }, () =>
        updateOrder(orderId, "served", undefined, "ready")
      ),
    [withRollback]
  );

  const markPaid = useCallback(
    (orderId: string) =>
      withRollback(orderId, { status: "paid" }, () =>
        updateOrder(orderId, "paid", undefined, "served")
      ),
    [withRollback]
  );

  const dineIn = orders.filter((o) => o.table !== "Livraison");

  const aServir = dineIn.filter(
    (o) => o.status === "ready" && !o.serverId
  );
  const mesCommandes = dineIn.filter(
    (o) =>
      o.serverId === staffId &&
      (o.status === "ready" || o.status === "served")
  );
  const payees = dineIn.filter(
    (o) => o.serverId === staffId && o.status === "paid"
  );

  return {
    orders,
    aServir,
    mesCommandes,
    payees,
    isLoading,
    claimOrder,
    markServed,
    markPaid,
  };
}
