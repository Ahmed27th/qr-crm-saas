import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

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

    const stripe = new (await import("stripe")).default(
      process.env.STRIPE_SECRET_KEY!
    );

    let event: any;
    try {
      event = await stripe.webhooks.constructEventAsync(bodyText, sigHeader, secret);
    } catch (err: any) {
      return new Response("Invalid signature", { status: 401 });
    }

    const dataObj = event.data?.object as any;
    if (!dataObj) return new Response("Missing object", { status: 400 });

    if (event.type === "checkout.session.completed") {
      if (dataObj.mode !== "subscription") return new Response("Not a subscription", { status: 200 });

      const userId = dataObj.metadata?.userId || dataObj.client_reference_id;
      const planId = dataObj.metadata?.planId;
      const billingPeriod = dataObj.metadata?.billingPeriod;
      const email = dataObj.customer_email || dataObj.customer_details?.email || "";
      const subscriptionId = dataObj.subscription;

      if (!userId || !planId || !billingPeriod) return new Response("Missing metadata", { status: 400 });

      if (subscriptionId) {
        let currentPeriodEnd = Date.now() + (billingPeriod === "yearly" ? 365 : 30) * 86400000;
        try {
          const sub: any = await stripe.subscriptions.retrieve(subscriptionId);
          currentPeriodEnd = (sub.current_period_end || 0) * 1000;
        } catch (e: any) {
          // fallback to calculated period
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

    if (event.type === "invoice.paid") {
      const subscriptionId = dataObj.subscription;
      if (subscriptionId) {
        const periodEnd = Date.now() + 30 * 86400000;
        const existingSub = await ctx.runQuery(api.subscriptions.getSubscriptionByStripeId, { stripeSubscriptionId: subscriptionId });
        if (existingSub) {
          await ctx.runMutation(api.subscriptions.updateSubscriptionPeriod, { subscriptionId: existingSub._id, status: "active", currentPeriodEnd: periodEnd });
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

      if (subId) {
        const existingSub = await ctx.runQuery(api.subscriptions.getSubscriptionByStripeId, { stripeSubscriptionId: subId });
        if (existingSub) {
          await ctx.runMutation(api.subscriptions.updateSubscriptionPeriod, { subscriptionId: existingSub._id, status, currentPeriodEnd: periodEnd });
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
