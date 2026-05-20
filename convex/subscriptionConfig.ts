/**
 * Lemon Squeezy checkout link ID to app tier mapping.
 * Each checkout URL contains a unique ID that identifies the product/variant.
 * This map ensures we always know which plan the user purchased,
 * even if custom_data.plan is missing from the webhook.
 */

export const CHECKOUT_ID_TO_PLAN: Record<string, { planId: string; billingPeriod: string }> = {
  // Starter - Monthly
  "6f1df6f9-ab9d-46f7-8f24-d9d1daa08c90": { planId: "starter", billingPeriod: "monthly" },
  // Starter - Yearly
  "5c111176-1b68-4e09-a5c8-40dc412409e6": { planId: "starter", billingPeriod: "yearly" },

  // Pro - Monthly
  "96c4bcaf-a41e-425f-a87e-60d43e0dc3d3": { planId: "pro", billingPeriod: "monthly" },
  // Pro - Yearly
  "39d74bf6-7d6a-45fe-8b1f-63949fcfbe42": { planId: "pro", billingPeriod: "yearly" },

  // Ultimate - Monthly
  "2c46c199-3fd3-4223-b63b-d06a1056d544": { planId: "ultimate", billingPeriod: "monthly" },
  // Ultimate - Yearly (same URL as monthly in current setup)
  "8aab7afb-e0e6-4862-afa3-626ce1fae247": { planId: "ultimate", billingPeriod: "yearly" },
};

/**
 * Resolve plan from checkout link ID.
 * Falls back to custom_data if ID not found in map.
 */
export function resolvePlanFromCheckoutId(
  checkoutLinkId: string,
  fallbackPlan?: string,
  fallbackBilling?: string
): { planId: string; billingPeriod: string } {
  const mapped = CHECKOUT_ID_TO_PLAN[checkoutLinkId];
  if (mapped) return mapped;

  // Fallback to custom_data or defaults
  return {
    planId: fallbackPlan || "pro",
    billingPeriod: fallbackBilling || "monthly",
  };
}
