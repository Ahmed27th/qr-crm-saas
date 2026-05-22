import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject.split("|")[0];
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const sub of existing) {
      await ctx.db.delete(sub._id);
    }
    await ctx.db.insert("pushSubscriptions", {
      userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
    });
  },
});

export const unsubscribe = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject.split("|")[0];
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const sub of existing) {
      await ctx.db.delete(sub._id);
    }
  },
});

export const getAllSubscriptions = query({
  handler: async (ctx) => {
    return await ctx.db.query("pushSubscriptions").collect();
  },
});

export const removeSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .filter((q) => q.eq(q.field("endpoint"), args.endpoint))
      .collect();
    for (const sub of existing) {
      await ctx.db.delete(sub._id);
    }
  },
});
