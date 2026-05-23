import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getDevicesByRestaurantId = query({
  args: { restaurantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("devices")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

export const upsertDevice = mutation({
  args: {
    restaurantId: v.string(),
    deviceName: v.string(),
    status: v.union(v.literal("online"), v.literal("offline")),
    lastSync: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("devices")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", args.restaurantId))
      .filter((q) => q.eq(q.field("deviceName"), args.deviceName))
      .collect();

    if (existing.length > 0) {
      await ctx.db.patch(existing[0]._id, {
        status: args.status,
        lastSync: args.lastSync,
      });
      return existing[0]._id;
    }

    return await ctx.db.insert("devices", {
      restaurantId: args.restaurantId,
      deviceName: args.deviceName,
      status: args.status,
      lastSync: args.lastSync,
    });
  },
});
