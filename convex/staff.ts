import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getStaff = query({
  args: { restaurantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();
  },
});

export const addStaff = mutation({
  args: {
    restaurantId: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("staff", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const deleteStaff = mutation({
  args: { id: v.id("staff") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
