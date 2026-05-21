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

    // Look up user from auth users table to get email/name if JWT doesn't carry them
    let userEmail = identity.email;
    let userName = identity.name;
    if (!userEmail) {
      const authUser = await ctx.db.get(userId as any);
      if (authUser && typeof authUser === 'object' && 'email' in authUser) {
        userEmail = (authUser as { email?: string; name?: string }).email || undefined;
        userName = (authUser as { email?: string; name?: string }).name || userName;
      }
    }

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

    if (!subscription && userEmail) {
      // Fallback: check all subscriptions for matching email
      const allSubs = await ctx.db.query("subscriptions").collect();
      subscription = allSubs.find(s => s.email?.toLowerCase() === userEmail!.toLowerCase()) || null;
    }

    // Fallback: try old email-derived userId format (e.g. "am_ahmed5maher_am_gmail_com")
    if (!subscription && userEmail) {
      const oldUserId = userEmail.replace(/[@.]/g, '_');
      subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_userId", (q) => q.eq("userId", oldUserId))
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

    // Get email from auth users table if JWT doesn't carry it
    let userEmail = identity.email;
    if (!userEmail) {
      const authUser = await ctx.db.get(stableUserId as any);
      if (authUser && typeof authUser === 'object' && 'email' in authUser) {
        userEmail = (authUser as { email?: string }).email || undefined;
      }
    }

    const allSubs = await ctx.db.query("subscriptions").collect();
    let linked = false;
    for (const sub of allSubs) {
      if (sub.email?.toLowerCase() === userEmail?.toLowerCase()) {
        await ctx.db.patch(sub._id, { userId: stableUserId });
        linked = true;
      }
    }
    return { linked, subject: identity.subject, email: userEmail };
  },
});
