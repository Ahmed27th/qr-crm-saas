/**
 * Lemon Squeezy variant ID to app tier mapping.
 * Each checkout link contains a unique variant_id that identifies the product/variant.
 * This map ensures we always know which plan the user purchased,
 * even if custom_data.plan is missing from the webhook.
 */

export const VARIANT_ID_TO_PLAN: Record<string, { planId: string; billingPeriod: string }> = {
  // Starter - Monthly
  "1675406": { planId: "starter", billingPeriod: "monthly" },
  // Starter - Yearly
  "1675438": { planId: "starter", billingPeriod: "yearly" },

  // Pro - Monthly
  "1675449": { planId: "pro", billingPeriod: "monthly" },
  // Pro - Yearly
  "1675452": { planId: "pro", billingPeriod: "yearly" },

  // Ultimate - Monthly
  "1675460": { planId: "ultimate", billingPeriod: "monthly" },
  // Ultimate - Yearly
  "1675468": { planId: "ultimate", billingPeriod: "yearly" },
};

/**
 * Resolve plan from variant ID.
 * Falls back to custom_data if variant ID not found in map.
 */
export function resolvePlanFromVariantId(
  variantId: string,
  fallbackPlan?: string,
  fallbackBilling?: string
): { planId: string; billingPeriod: string } {
  const mapped = VARIANT_ID_TO_PLAN[variantId];
  if (mapped) return mapped;

  // Fallback to custom_data or defaults
  return {
    planId: fallbackPlan || "pro",
    billingPeriod: fallbackBilling || "monthly",
  };
}
