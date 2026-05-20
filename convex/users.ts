import { query, mutation } from "./_generated/server";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log("me query identity:", JSON.stringify(identity));
    if (!identity) return null;

    // Try looking up by subject first
    let subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
    console.log("subscription by subject:", subscription);

    if (!subscription && identity.email) {
      // Fallback 1: check all subscriptions for matching email
      const allSubs = await ctx.db.query("subscriptions").collect();
      console.log("all subscriptions:", allSubs.map(s => ({ userId: s.userId, email: s.email })));
      subscription = allSubs.find(s => s.email?.toLowerCase() === identity.email!.toLowerCase()) || null;
      console.log("subscription by email:", subscription);
    }

    // Fallback 2: try old email-derived userId format (e.g. "am_ahmed5maher_am_gmail_com")
    if (!subscription && identity.email) {
      const oldUserId = identity.email.replace(/[@.]/g, '_');
      console.log("trying old userId:", oldUserId);
      subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", oldUserId))
        .first();
      console.log("subscription by old userId:", subscription);
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

export const linkSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const allSubs = await ctx.db.query("subscriptions").collect();
    let linked = false;
    for (const sub of allSubs) {
      if (sub.email?.toLowerCase() === identity.email?.toLowerCase()) {
        await ctx.db.patch(sub._id, { userId: identity.subject });
        linked = true;
      }
    }
    return { linked, subject: identity.subject, email: identity.email };
  },
});
