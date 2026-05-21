import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";
import { resolvePlanFromVariantId } from "./subscriptionConfig";

declare const process: {
  env: Record<string, string | undefined>;
};

function parseLsDate(dateStr: string | undefined | null): number | null {
  if (!dateStr) return null;
  const ms = Date.parse(dateStr);
  return Number.isNaN(ms) ? null : ms;
}

function getBillingPeriodMs(billingPeriod: string): number {
  return billingPeriod === "yearly"
    ? 365 * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
}

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/lemon-squeezy-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("X-Signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    const bodyText = await request.text();
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("LEMON_SQUEEZY_WEBHOOK_SECRET is not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
    const hexMac = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (hexMac !== signature) {
      console.error("Invalid Lemon Squeezy webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const eventName = payload.meta?.event_name;
    if (!eventName) {
      return new Response("Missing event name", { status: 400 });
    }

    const customData = payload.meta?.custom_data || {};
    const userId = customData.user_id;

    const variantId = String(
      payload.data?.attributes?.first_order_item?.variant_id 
      || payload.data?.attributes?.variant_id 
      || ""
    );
    const { planId, billingPeriod } = resolvePlanFromVariantId(
      variantId,
      customData.plan,
      customData.billing
    );

    if (!userId) {
      return new Response("Missing user_id in custom data", { status: 400 });
    }

    const attributes = payload.data?.attributes;
    if (!attributes) {
      return new Response("Missing data attributes", { status: 400 });
    }

    const email = attributes.user_email || "";
    const orderId = String(payload.data?.id || "");
    const subId = String(payload.data?.id || "");
    const now = Date.now();
    const billingMs = getBillingPeriodMs(billingPeriod);

    // Try to get actual dates from LS payload; fall back to computed from now
    const renewsAt = parseLsDate(attributes.renews_at);
    const endsAt = parseLsDate(attributes.ends_at);
    const trialEndsAt = parseLsDate(attributes.trial_ends_at);

    if (eventName === "order_created") {
      const firstSub = attributes.first_subscription;
      const lsRenew = firstSub ? parseLsDate(firstSub.renews_at) : null;
      const periodEnd = lsRenew || renewsAt || (now + billingMs);
      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId,
        email,
        planId,
        billingPeriod,
        status: "active",
        lemonSqueezyOrderId: orderId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    if (eventName === "subscription_created") {
      const periodEnd = renewsAt || trialEndsAt || (now + billingMs);
      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId,
        email,
        planId,
        billingPeriod,
        status: "active",
        lemonSqueezyOrderId: orderId,
        lemonSqueezySubscriptionId: subId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    if (eventName === "subscription_payment_success") {
      // LS sends the new renews_at after each successful recurring payment
      // Use it directly, or extend from existing end by one billing period
      const periodEnd = renewsAt || (trialEndsAt || (now + billingMs));
      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId,
        email,
        planId,
        billingPeriod,
        status: "active",
        lemonSqueezyOrderId: orderId,
        lemonSqueezySubscriptionId: subId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    if (eventName === "subscription_updated") {
      const status = attributes.status || "active";
      const periodEnd = renewsAt || trialEndsAt || (now + billingMs);
      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId,
        email,
        planId,
        billingPeriod,
        status,
        lemonSqueezyOrderId: orderId,
        lemonSqueezySubscriptionId: subId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    if (eventName === "subscription_cancelled") {
      // Use LS ends_at so user keeps access through the paid period
      const periodEnd = endsAt || now;
      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId,
        email,
        planId,
        billingPeriod,
        status: "cancelled",
        lemonSqueezyOrderId: orderId,
        lemonSqueezySubscriptionId: subId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
    }

    if (eventName === "subscription_expired") {
      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId,
        email,
        planId,
        billingPeriod,
        status: "expired",
        lemonSqueezyOrderId: orderId,
        lemonSqueezySubscriptionId: subId,
        currentPeriodStart: now,
        currentPeriodEnd: now,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
