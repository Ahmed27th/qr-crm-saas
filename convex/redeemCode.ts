import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function generateCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const generateCode = mutation({
  args: {
    planId: v.string(),
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const code = generateCodeString();
    const now = Date.now();

    await ctx.db.insert("subscriptionCodes", {
      code,
      planId: args.planId,
      durationDays: args.durationDays,
      used: false,
      createdBy: "admin",
      createdAt: now,
    });

    return code;
  },
});

export const redeemCode = mutation({
  args: { code: v.string(), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject?.split("|")[0];
    const email = identity?.email || args.email || "";

    const codeDoc = await ctx.db
      .query("subscriptionCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!codeDoc) throw new Error("Invalid code");
    if (codeDoc.used) throw new Error("Code already used");

    const now = Date.now();

    let existing = null;
    let resolvedUserId = "";
    if (userId) {
      resolvedUserId = userId;
      existing = await ctx.db
        .query("subscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();
    }
    if (!existing && email) {
      const allSubs = await ctx.db.query("subscriptions").collect();
      existing = allSubs.find((s) => s.email?.toLowerCase() === email.toLowerCase()) ?? null;
      if (existing) resolvedUserId = existing.userId;
    }
    if (!resolvedUserId) resolvedUserId = "anon-" + Date.now();

    if (existing) {
      const currentEnd = existing.currentPeriodEnd > now ? existing.currentPeriodEnd : now;
      await ctx.db.patch(existing._id, {
        planId: codeDoc.planId,
        status: "active",
        currentPeriodEnd: currentEnd + codeDoc.durationDays * 86400000,
        email: email || existing.email,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: resolvedUserId,
        email: email || "",
        planId: codeDoc.planId,
        billingPeriod: "monthly",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: now + codeDoc.durationDays * 86400000,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(codeDoc._id, {
      used: true,
      usedByUserId: resolvedUserId,
      usedByEmail: email,
      usedAt: now,
    });

    return { planId: codeDoc.planId, durationDays: codeDoc.durationDays };
  },
});

export const getAllCodes = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("subscriptionCodes").order("desc").collect();
  },
});
