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

    // Verify HMAC-SHA256 signature using Web Crypto API
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
    const planId = customData.plan;
    const billing = customData.billing;

    if (!userId) {
      return new Response("Missing user_id in custom data", { status: 400 });
    }

    const attributes = payload.data?.attributes;
    if (!attributes) {
      return new Response("Missing data attributes", { status: 400 });
    }

    const email = attributes.user_email || "";
    const orderId = String(payload.data?.id || "");

    // Verify email matches the account owner
    const authAccount = await ctx.db.system.query("_auth_account")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const registeredEmail = authAccount?.email?.toLowerCase();
    const paidEmail = email.toLowerCase();

    if (registeredEmail && registeredEmail !== paidEmail) {
      console.error(`Email mismatch: registered=${registeredEmail}, paid=${paidEmail}`);
      return new Response("Email mismatch: payment email does not match account email", { status: 400 });
    }

    const now = Date.now();

    if (eventName === "order_created") {
      await ctx.runMutation(api.subscriptions.upsertSubscription, {
        userId,
        email,
        planId: planId || "pro",
        billingPeriod: billing || "monthly",
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
        planId: planId || "pro",
        billingPeriod: billing || "monthly",
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
        planId: planId || "pro",
        billingPeriod: billing || "monthly",
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
        planId: planId || "pro",
        billingPeriod: billing || "monthly",
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
