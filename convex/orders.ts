import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByRestaurant = query({
  args: { restaurantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    restaurantId: v.string(),
    table: v.string(),
    items: v.number(),
    total: v.number(),
    status: v.string(),
    source: v.string(),
    orderItems: v.array(v.object({
      name: v.string(),
      qty: v.number(),
      price: v.number(),
    })),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    customerAddress: v.optional(v.string()),
    deliveryInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("orders", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("orders"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const assignDriver = mutation({
  args: {
    id: v.id("orders"),
    driverId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { driverId: args.driverId });
  },
});

/**
 * Claim an order only if it's still unclaimed (status === 'ready', no serverId).
 * Throws ConvexError with code 409 on conflict.
 */
export const claimOrder = mutation({
  args: {
    id: v.id("orders"),
    serverId: v.string(),
    expectedStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) throw new ConvexError({ code: 404, message: "Order not found" });
    if (order.status !== "ready" || order.serverId) {
      throw new ConvexError({
        code: 409,
        message: `Conflict: order ${args.id} has status "${order.status}", serverId "${order.serverId}". Expected "ready" / unclaimed.`,
        currentStatus: order.status,
        currentServerId: order.serverId,
      });
    }
    await ctx.db.patch(args.id, { serverId: args.serverId });
  },
});

/**
 * Mark an order as served only if it's currently 'ready'.
 */
export const markServed = mutation({
  args: {
    id: v.id("orders"),
    expectedStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) throw new ConvexError({ code: 404, message: "Order not found" });
    if (order.status !== "ready") {
      throw new ConvexError({
        code: 409,
        message: `Conflict: order ${args.id} has status "${order.status}". Expected "ready".`,
        currentStatus: order.status,
      });
    }
    await ctx.db.patch(args.id, { status: "served" });
  },
});

/**
 * Mark an order as paid only if it's currently 'served'.
 */
export const markPaid = mutation({
  args: {
    id: v.id("orders"),
    expectedStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) throw new ConvexError({ code: 404, message: "Order not found" });
    if (order.status !== "served") {
      throw new ConvexError({
        code: 409,
        message: `Conflict: order ${args.id} has status "${order.status}". Expected "served".`,
        currentStatus: order.status,
      });
    }
    await ctx.db.patch(args.id, { status: "paid" });
  },
});
