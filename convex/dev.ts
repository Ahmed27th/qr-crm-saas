import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getAllSubscriptions = query({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db.query("subscriptions").collect();
    const enriched = [];
    for (const sub of subs) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", sub.userId))
        .first();
      enriched.push({
        ...sub,
        restaurantName: profile?.name ?? null,
      });
    }
    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const createSubscription = mutation({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
    planId: v.string(),
    billingPeriod: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        planId: args.planId,
        billingPeriod: args.billingPeriod,
        status: args.status,
        email: args.email,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("subscriptions", {
      userId: args.userId,
      email: args.email,
      planId: args.planId,
      billingPeriod: args.billingPeriod,
      status: args.status,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const extendSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Subscription not found");
    const now = Date.now();
    const currentEnd = sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
    const newEnd = currentEnd + args.days * 86400000;
    await ctx.db.patch(args.subscriptionId, {
      currentPeriodEnd: newEnd,
      status: "active",
      updatedAt: now,
    });
  },
});

export const setSubscriptionStatus = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    status: v.string(),
    planId: v.optional(v.string()),
    billingPeriod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Subscription not found");
    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.planId) patch.planId = args.planId;
    if (args.billingPeriod) patch.billingPeriod = args.billingPeriod;
    await ctx.db.patch(args.subscriptionId, patch);
  },
});

export const deleteSubscription = mutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.subscriptionId);
    if (!sub) throw new Error("Subscription not found");
    await ctx.db.delete(args.subscriptionId);
  },
});
