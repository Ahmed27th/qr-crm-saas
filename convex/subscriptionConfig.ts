export const STRIPE_PRICE_ID_TO_PLAN: Record<string, { planId: string; billingPeriod: string }> = {
  "price_1TZg2XFxHQI0T7q9CogM1ICD": { planId: "starter", billingPeriod: "monthly" },
  "price_1TZg2YFxHQI0T7q95oBCCFen": { planId: "starter", billingPeriod: "yearly" },
  "price_1TZg2YFxHQI0T7q9dzXDJyLy": { planId: "pro", billingPeriod: "monthly" },
  "price_1TZg2ZFxHQI0T7q9nLK3CRPP": { planId: "pro", billingPeriod: "yearly" },
  "price_1TZg2ZFxHQI0T7q9SnGqAji1": { planId: "ultimate", billingPeriod: "monthly" },
  "price_1TZg2ZFxHQI0T7q9C7c4r4BH": { planId: "ultimate", billingPeriod: "yearly" },
};

export const PLAN_TO_STRIPE_PRICE: Record<string, Record<string, string>> = {
  starter: {
    monthly: "price_1TZg2XFxHQI0T7q9CogM1ICD",
    yearly: "price_1TZg2YFxHQI0T7q95oBCCFen",
  },
  pro: {
    monthly: "price_1TZg2YFxHQI0T7q9dzXDJyLy",
    yearly: "price_1TZg2ZFxHQI0T7q9nLK3CRPP",
  },
  ultimate: {
    monthly: "price_1TZg2ZFxHQI0T7q9SnGqAji1",
    yearly: "price_1TZg2ZFxHQI0T7q9C7c4r4BH",
  },
};

export function resolvePlanFromPriceId(
  priceId: string,
  fallbackPlan?: string,
  fallbackBilling?: string
): { planId: string; billingPeriod: string } {
  const mapped = STRIPE_PRICE_ID_TO_PLAN[priceId];
  if (mapped) return mapped;
  return {
    planId: fallbackPlan || "pro",
    billingPeriod: fallbackBilling || "monthly",
  };
}
