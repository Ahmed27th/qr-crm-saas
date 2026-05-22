const VAPID_PUBLIC_KEY = "BEC4XISlaX_Nwz9oop_yOrpX2PNIniqpNYC6GXD3Qv1T2WFa4rTEmwlNGkuptPfRV8xR3PVXYmXarSWFkCTVlWU";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData.split("").map((c) => c.charCodeAt(0)));
}

export const PushService = {
  async subscribe(convex: any): Promise<boolean> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
        });
      }
      const subJson = subscription.toJSON();
      if (subJson.endpoint && subJson.keys) {
        await convex.mutation("push:subscribe", {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        });
      }
      return true;
    } catch {
      return false;
    }
  },

  async unsubscribe(convex: any): Promise<boolean> {
    if (!("serviceWorker" in navigator)) return false;
    try {
      await convex.mutation("push:unsubscribe");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      return true;
    } catch {
      return false;
    }
  },
};
