import { useState, useEffect, useRef, useCallback } from "react";
import { DataStore, type Order } from "../dataStore";

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

export function useOrderManagement({
  restaurantId,
  staffId,
}: UseOrderManagementOptions): UseOrderManagementReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const optimisticRef = useRef<Map<string, OptimisticOverride>>(new Map());
  const rollbackRef = useRef<Map<string, { snapshot: Order; overrides: Map<string, OptimisticOverride> }>>(new Map());

  useEffect(() => {
    const unsub = DataStore.subscribeToOrders((next) => {
      setOrders(next);
      setIsLoading(false);
    }, restaurantId);
    return () => { if (unsub) unsub(); };
  }, [restaurantId]);

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
        const isConflict = data?.code === 409;
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
        DataStore.claimOrder(orderId, staffId)
      ),
    [staffId, withRollback]
  );

  const markServed = useCallback(
    (orderId: string) =>
      withRollback(orderId, { status: "served" }, () =>
        DataStore.markServed(orderId)
      ),
    [withRollback]
  );

  const markPaid = useCallback(
    (orderId: string) =>
      withRollback(orderId, { status: "paid" }, () =>
        DataStore.markPaid(orderId)
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
