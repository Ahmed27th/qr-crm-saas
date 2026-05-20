import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByDriverId = query({
  args: { driverId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("driverLocations")
      .withIndex("by_driverId", (q) => q.eq("driverId", args.driverId))
      .first();
  },
});

export const updateLocation = mutation({
  args: {
    driverId: v.string(),
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("driverLocations")
      .withIndex("by_driverId", (q) => q.eq("driverId", args.driverId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lat: args.lat,
        lng: args.lng,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("driverLocations", {
        driverId: args.driverId,
        lat: args.lat,
        lng: args.lng,
        updatedAt: Date.now(),
      });
    }
  },
});
