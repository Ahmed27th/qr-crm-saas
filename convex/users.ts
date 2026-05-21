import { query, mutation } from "./_generated/server";

function getStableUserId(subject: string): string {
  return subject.split('|')[0];
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = getStableUserId(identity.subject);

    const userEmail = identity.email;
    const userName = identity.name;

    // Try looking up by stable user ID first (userId without session)
    let subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    // Fallback: try full subject (backwards compat with already-patched subs)
    if (!subscription) {
      subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .first();
    }

    if (!subscription) return {
      subject: identity.subject,
      email: userEmail,
      name: userName,
      subscription: null,
    };

    const now = Date.now();
    const isExpired = subscription.currentPeriodEnd < now;
    const effectiveStatus = isExpired ? 'expired' : subscription.status;

    return {
      subject: identity.subject,
      email: userEmail,
      name: userName,
      subscription: { ...subscription, status: effectiveStatus },
    };
  },
});

export const getSubject = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return identity.subject;
  },
});

export const linkSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const stableUserId = getStableUserId(identity.subject);

    const userEmail = identity.email;

    const allSubs = await ctx.db.query("subscriptions").collect();
    let linked = false;
    for (const sub of allSubs) {
      if (userEmail && sub.email?.toLowerCase() === userEmail.toLowerCase()) {
        await ctx.db.patch(sub._id, { userId: stableUserId });
        linked = true;
      }
    }
    return { linked, subject: identity.subject, email: userEmail };
  },
});
