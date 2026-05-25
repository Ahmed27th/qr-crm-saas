import { action } from "./_generated/server";
import { api } from "./_generated/api";

const TRIAL_DAYS = 7;

export const startTrial = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject.split("|")[0];
    const existing = await ctx.runQuery(api.subscriptions.getSubscription, { userId });

    if (existing && existing.status !== "expired") {
      throw new Error("You already have an active subscription");
    }

    const now = Date.now();
    const trialEnd = now + TRIAL_DAYS * 24 * 60 * 60 * 1000;

    await ctx.runMutation(api.subscriptions.upsertSubscription, {
      userId,
      email: identity.email ?? undefined,
      planId: "ultimate",
      billingPeriod: "monthly",
      status: "trialing",
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
    });

    return { trialEndsAt: trialEnd };
  },
});
