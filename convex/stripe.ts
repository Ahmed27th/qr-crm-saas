import { v } from "convex/values";
import { action } from "./_generated/server";
import { PLAN_TO_STRIPE_PRICE } from "./subscriptionConfig";

declare const process: {
  env: Record<string, string | undefined>;
};

export const createCheckoutSession = action({
  args: {
    planId: v.string(),
    billingPeriod: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = identity.subject.split("|")[0];
    const priceId = PLAN_TO_STRIPE_PRICE[args.planId]?.[args.billingPeriod];
    if (!priceId) throw new Error("Invalid plan or billing period");

    const stripe = new (await import("stripe")).default(
      process.env.STRIPE_SECRET_KEY!
    );

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      customer_email: identity.email || undefined,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        userId,
        planId: args.planId,
        billingPeriod: args.billingPeriod,
      },
      subscription_data: {
        metadata: {
          userId,
          planId: args.planId,
          billingPeriod: args.billingPeriod,
        },
      },
    });

    if (!session.url) throw new Error("Failed to create checkout session");
    return { url: session.url, sessionId: session.id };
  },
});
