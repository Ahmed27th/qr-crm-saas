import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getDrivers = query({
  args: { restaurantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("drivers")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

export const addDriver = mutation({
  args: {
    restaurantId: v.string(),
    name: v.string(),
    phone: v.string(),
    status: v.string(),
    activeOrders: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("drivers", args);
  },
});

export const updateDriver = mutation({
  args: {
    id: v.id("drivers"),
    updates: v.object({
      status: v.optional(v.string()),
      activeOrders: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.updates);
  },
});

export const deleteDriver = mutation({
  args: { id: v.id("drivers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
