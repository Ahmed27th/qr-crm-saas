import { query } from "./_generated/server";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Try looking up by subject first, then by email
    let subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();

    if (!subscription && identity.email) {
      // Fallback: check all subscriptions for matching email
      const allSubs = await ctx.db.query("subscriptions").collect();
      subscription = allSubs.find(s => s.email?.toLowerCase() === identity.email.toLowerCase()) || null;
    }

    if (!subscription) return {
      subject: identity.subject,
      email: identity.email,
      name: identity.name,
      subscription: null,
    };

    const now = Date.now();
    const isExpired = subscription.currentPeriodEnd < now;
    const effectiveStatus = isExpired ? 'expired' : subscription.status;

    return {
      subject: identity.subject,
      email: identity.email,
      name: identity.name,
      subscription: { ...subscription, status: effectiveStatus },
    };
  },
});
