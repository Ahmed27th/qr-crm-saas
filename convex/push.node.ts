"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const VAPID_PUBLIC_KEY = "BEC4XISlaX_Nwz9oop_yOrpX2PNIniqpNYC6GXD3Qv1T2WFa4rTEmwlNGkuptPfRV8xR3PVXYmXarSWFkCTVlWU";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "AEz4IxiEfz9aV0OpTz7IcNU9z_ntMGh2cOurxw-h10M";

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
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
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
