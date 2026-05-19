import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/lemon-squeezy-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();

    const signature = request.headers.get("X-Signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const eventName = payload.meta?.event_name;
    if (!eventName) {
      return new Response("Missing event name", { status: 400 });
    }

    const customData = payload.meta?.custom_data || {};
    const userId = customData.user_id;
    const planId = customData.plan;
    const billing = customData.billing;

    if (!userId || !planId || !billing) {
      return new Response("Missing custom data (user_id, plan, billing)", { status: 400 });
    }

    const attributes = payload.data?.attributes;
    if (!attributes) {
      return new Response("Missing data attributes", { status: 400 });
    }

    const email = attributes.user_email || "";
    const orderId = String(payload.data?.id || "");

    const now = Date.now();

    if (eventName === "order_created") {
      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId,
        email,
        planId,
        billingPeriod: billing,
        status: "active",
        lemonSqueezyOrderId: orderId,
        currentPeriodStart: now,
        currentPeriodEnd: billing === "yearly" ? now + 365 * 24 * 60 * 60 * 1000 : now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    if (eventName === "subscription_created") {
      const subId = String(payload.data?.id || "");
      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId,
        email,
        planId,
        billingPeriod: billing,
        status: "active",
        lemonSqueezyOrderId: orderId,
        lemonSqueezySubscriptionId: subId,
        currentPeriodStart: now,
        currentPeriodEnd: billing === "yearly" ? now + 365 * 24 * 60 * 60 * 1000 : now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    if (eventName === "subscription_updated") {
      const status = attributes.status || "active";
      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId,
        email,
        planId,
        billingPeriod: billing,
        status,
        lemonSqueezyOrderId: orderId,
        currentPeriodStart: now,
        currentPeriodEnd: billing === "yearly" ? now + 365 * 24 * 60 * 60 * 1000 : now + 30 * 24 * 60 * 60 * 1000,
      });
    }

    if (eventName === "subscription_cancelled") {
      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId,
        email,
        planId,
        billingPeriod: billing,
        status: "cancelled",
        lemonSqueezyOrderId: orderId,
        currentPeriodStart: now,
        currentPeriodEnd: now,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
