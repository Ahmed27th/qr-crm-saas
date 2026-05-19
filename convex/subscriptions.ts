import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getSubscription = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getUserAccessLevel = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    // Starter plan could also have some access. We just check if they are active and have a plan.
    const isActive = sub?.status === "active";
    
    return {
      isActive,
      isPremium: isActive && (sub?.planId === "pro" || sub?.planId === "ultimate"),
      planId: sub?.planId || "none",
      status: sub?.status || "none",
    };
  },
});

export const upsertSubscription = mutation({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
    planId: v.string(),
    billingPeriod: v.string(),
    status: v.string(),
    lemonSqueezyOrderId: v.optional(v.string()),
    lemonSqueezySubscriptionId: v.optional(v.string()),
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
        lemonSqueezyOrderId: args.lemonSqueezyOrderId,
        lemonSqueezySubscriptionId: args.lemonSqueezySubscriptionId,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("subscriptions", {
        userId: args.userId,
        email: args.email,
        planId: args.planId,
        billingPeriod: args.billingPeriod,
        status: args.status,
        lemonSqueezyOrderId: args.lemonSqueezyOrderId,
        lemonSqueezySubscriptionId: args.lemonSqueezySubscriptionId,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
