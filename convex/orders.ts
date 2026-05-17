import { v } from "convex/values";
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
