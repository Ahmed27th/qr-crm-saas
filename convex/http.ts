import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";
import { resolvePlanFromPriceId } from "./subscriptionConfig";

declare const process: {
  env: Record<string, string | undefined>;
};

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const bodyText = await request.text();
    const sigHeader = request.headers.get("stripe-signature");
    if (!sigHeader) {
      return new Response("Missing stripe-signature header", { status: 401 });
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const Stripe = await import("stripe");
    const stripe = new Stripe.default(
      process.env.STRIPE_SECRET_KEY!,
      { httpClient: Stripe.default.createFetchHttpClient() }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;
    try {
      event = await stripe.webhooks.constructEventAsync(bodyText, sigHeader, secret);
    } catch {
      return new Response("Invalid signature", { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataObj = event.data?.object as any;
    if (!dataObj) return new Response("Missing object", { status: 400 });

    // Helper: extract subscription info from any event with a price/plan context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function extractSubInfo(obj: any): { userId?: string; planId?: string; billingPeriod?: string } {
      // Try metadata first (set via stripe.session.create metadata / subscription_data.metadata)
      const meta = obj.metadata || {};
      const userId = meta.userId || obj.client_reference_id;
      let planId = meta.planId;
      let billingPeriod = meta.billingPeriod;

      // If line_items are available, resolve plan from price ID
      if (!planId && obj.items?.data?.[0]?.price?.id) {
        const resolved = resolvePlanFromPriceId(obj.items.data[0].price.id);
        if (resolved.planId) {
          planId = resolved.planId;
          billingPeriod = resolved.billingPeriod;
        }
      }

      return { userId, planId, billingPeriod };
    }

    if (event.type === "checkout.session.completed") {
      if (dataObj.mode !== "subscription") return new Response("Not a subscription", { status: 200 });

      const { userId, planId, billingPeriod } = extractSubInfo(dataObj);
      const email = dataObj.customer_email || dataObj.customer_details?.email || "";
      const subscriptionId = dataObj.subscription;

      if (!userId || !planId || !billingPeriod) return new Response("Missing metadata: " + JSON.stringify({ userId, planId, billingPeriod }), { status: 400 });

      if (subscriptionId) {
        const now = Date.now();
        let currentPeriodEnd = now + (billingPeriod === "yearly" ? 365 : 30) * 86400000;
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId) as { current_period_end?: number };
          if (sub?.current_period_end) {
            currentPeriodEnd = sub.current_period_end * 1000;
          }
        } catch {
          // stripe.subscriptions.retrieve may fail in Convex runtime;
          // fallback to calculated period is used
        }
        if (!currentPeriodEnd || currentPeriodEnd <= now) {
          currentPeriodEnd = now + (billingPeriod === "yearly" ? 365 : 30) * 86400000;
        }
        await ctx.runMutation(api.subscriptions.upsertSubscription, {
          userId,
          email,
          planId,
          billingPeriod,
          status: "active",
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: dataObj.customer as string,
          currentPeriodStart: Date.now(),
          currentPeriodEnd,
        });
      }
    }

    // customer.subscription.created fires reliably after checkout.session.completed
    // and carries the subscription metadata set via subscription_data.metadata
    if (event.type === "customer.subscription.created") {
      const subId = dataObj.id;
      const { userId, planId, billingPeriod } = extractSubInfo(dataObj);
      const periodEnd = (dataObj.current_period_end || 0) * 1000;
      const periodStart = (dataObj.current_period_start || 0) * 1000;

      if (subId && userId && planId && billingPeriod) {
        // Only create if not already created by checkout.session.completed
        const existingSub = await ctx.runQuery(api.subscriptions.getSubscriptionByStripeId, { stripeSubscriptionId: subId });
        if (!existingSub) {
          const safePeriodEnd = periodEnd && periodEnd > Date.now() ? periodEnd : Date.now() + 30 * 86400000;
          await ctx.runMutation(api.subscriptions.upsertSubscription, {
            userId,
            email: "",
            planId,
            billingPeriod,
            status: "active",
            stripeSubscriptionId: subId,
            stripeCustomerId: dataObj.customer as string,
            currentPeriodStart: periodStart,
            currentPeriodEnd: safePeriodEnd,
          });
        }
      }
    }

    if (event.type === "invoice.paid") {
      const subscriptionId = dataObj.subscription;
      const { userId, planId, billingPeriod } = extractSubInfo(dataObj);
      if (subscriptionId) {
        const now = Date.now();
        let periodEnd = now + 30 * 86400000;
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId) as { current_period_end?: number };
          if (sub?.current_period_end) {
            periodEnd = sub.current_period_end * 1000;
          }
        } catch {
          // fallback
        }
        if (!periodEnd || periodEnd <= now) {
          periodEnd = now + 30 * 86400000;
        }
        const existingSub = await ctx.runQuery(api.subscriptions.getSubscriptionByStripeId, { stripeSubscriptionId: subscriptionId });
        if (existingSub) {
          await ctx.runMutation(api.subscriptions.updateSubscriptionPeriod, { subscriptionId: existingSub._id, status: "active", currentPeriodEnd: periodEnd });
        } else if (userId && planId && billingPeriod) {
          // Fallback: invoice.paid may arrive before checkout.session.completed for renewals
          await ctx.runMutation(api.subscriptions.upsertSubscription, {
            userId,
            email: "",
            planId,
            billingPeriod,
            status: "active",
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: dataObj.customer as string,
            currentPeriodStart: Date.now(),
            currentPeriodEnd: periodEnd,
          });
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const subId = dataObj.id;
      const status = dataObj.status === "active" ? "active"
        : dataObj.status === "past_due" ? "past_due"
        : dataObj.status === "canceled" ? "cancelled"
        : dataObj.status === "incomplete" ? "active"
        : dataObj.status;
      const periodEnd = (dataObj.current_period_end || 0) * 1000;
      const safePeriodEnd = periodEnd && periodEnd > Date.now() ? periodEnd : Date.now() + 30 * 86400000;

      if (subId) {
        const existingSub = await ctx.runQuery(api.subscriptions.getSubscriptionByStripeId, { stripeSubscriptionId: subId });
        if (existingSub) {
          await ctx.runMutation(api.subscriptions.updateSubscriptionPeriod, { subscriptionId: existingSub._id, status, currentPeriodEnd: safePeriodEnd });
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subId = dataObj.id;
      if (subId) {
        const existingSub = await ctx.runQuery(api.subscriptions.getSubscriptionByStripeId, { stripeSubscriptionId: subId });
        if (existingSub) {
          await ctx.runMutation(api.subscriptions.updateSubscriptionPeriod, { subscriptionId: existingSub._id, status: "expired", currentPeriodEnd: Date.now() });
        }
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
