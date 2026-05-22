import { v } from "convex/values";
import { mutation, action, query } from "./_generated/server";
import { api } from "./_generated/api";

const vapidKeys = {
  publicKey: "BEC4XISlaX_Nwz9oop_yOrpX2PNIniqpNYC6GXD3Qv1T2WFa4rTEmwlNGkuptPfRV8xR3PVXYmXarSWFkCTVlWU",
  privateKey: "AEz4IxiEfz9aV0OpTz7IcNU9z_ntMGh2cOurxw-h10M",
};

export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject.split("|")[0];
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const sub of existing) {
      await ctx.db.delete(sub._id);
    }
    await ctx.db.insert("pushSubscriptions", {
      userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
    });
  },
});

export const unsubscribe = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject.split("|")[0];
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const sub of existing) {
      await ctx.db.delete(sub._id);
    }
  },
});

export const sendToAll = action({
  args: {
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subs = await ctx.runQuery(api.push.getAllSubscriptions);
    const webpush = await import("web-push");
    webpush.setVapidDetails(
      "mailto:admin@qr-crm.com",
      vapidKeys.publicKey,
      vapidKeys.privateKey,
    );
    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url || "/dashboard",
    });
    await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          )
          .catch(() => {
            ctx.runMutation(api.push.removeSubscription, {
              endpoint: sub.endpoint,
            });
          }),
      ),
    );
  },
});

export const getAllSubscriptions = query({
  handler: async (ctx) => {
    return await ctx.db.query("pushSubscriptions").collect();
  },
});

export const removeSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .filter((q) => q.eq(q.field("endpoint"), args.endpoint))
      .collect();
    for (const sub of existing) {
      await ctx.db.delete(sub._id);
    }
  },
});
