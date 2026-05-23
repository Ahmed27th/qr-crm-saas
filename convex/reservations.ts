import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getReservations = query({
  args: { restaurantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reservations")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", args.restaurantId))
      .order("desc")
      .collect();
  },
});

export const getByDate = query({
  args: { restaurantId: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reservations")
      .withIndex("by_restaurantId_date", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("date", args.date))
      .collect();
    return rows.sort((a, b) => a.time.localeCompare(b.time));
  },
});

export const addReservation = mutation({
  args: {
    restaurantId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    date: v.string(),
    time: v.string(),
    guests: v.number(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reservations", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("reservations"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});
