import { query } from "./_generated/server";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();

    return {
      subject: identity.subject,
      email: identity.email,
      name: identity.name,
      subscription: subscription ?? null,
    };
  },
});
