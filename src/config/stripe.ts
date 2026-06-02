// Stripe Product and Price Configuration
// These IDs are from the Stripe Dashboard.
// Starter is free (no Stripe product). Enterprise is contact-sales.

export const STRIPE_CONFIG = {
  products: {
    team: {
      productId: "prod_Ud9RX485SvPTs6",
      priceId: "price_1Tdt8UG45CY5mATXig8jDzSi",
      name: "Team",
      priceMonthly: 149,
    },
    growth: {
      productId: "prod_Ud9TK3ZsxydQcQ",
      priceId: "price_1TdtAZG45CY5mATXjYLsrF5r",
      name: "Growth",
      priceMonthly: 399,
    },
  },
} as const;

export type StripePlanId = keyof typeof STRIPE_CONFIG.products;

export function getStripePriceId(planId: string): string | null {
  if (planId === "team") return STRIPE_CONFIG.products.team.priceId;
  if (planId === "growth") return STRIPE_CONFIG.products.growth.priceId;
  return null;
}

export function getStripeProductId(planId: string): string | null {
  if (planId === "team") return STRIPE_CONFIG.products.team.productId;
  if (planId === "growth") return STRIPE_CONFIG.products.growth.productId;
  return null;
}

export function getPlanIdFromProductId(productId: string): string {
  if (productId === STRIPE_CONFIG.products.team.productId) return "team";
  if (productId === STRIPE_CONFIG.products.growth.productId) return "growth";
  return "starter";
}
