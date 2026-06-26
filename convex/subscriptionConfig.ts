export const PLANS = {
  starter: {
    name: "Starter",
    features: ["reviews"],
  },
  pro: {
    name: "Pro",
    features: ["menu", "reviews", "orders", "reservations", "analytics"],
  },
  ultimate: {
    name: "Ultimate",
    features: ["menu", "reviews", "orders", "reservations", "analytics", "drivers", "staff"],
  },
} as const;

export type PlanId = keyof typeof PLANS;
