// Stripe Product and Price Configuration
// These IDs are from the Stripe Dashboard

export const STRIPE_CONFIG = {
  products: {
    pro: {
      productId: "prod_TqpRp9M0STW5f3",
      priceId: "price_1St7mPG45CY5mATXpSHF0gry",
      name: "Pro",
      priceMonthly: 29,
    },
    // Enterprise is handled via contact sales - no Stripe product
  },
} as const;

export type StripePlanId = keyof typeof STRIPE_CONFIG.products;

export function getStripePriceId(planId: string): string | null {
  if (planId === "pro") {
    return STRIPE_CONFIG.products.pro.priceId;
  }
  return null;
}

export function getStripeProductId(planId: string): string | null {
  if (planId === "pro") {
    return STRIPE_CONFIG.products.pro.productId;
  }
  return null;
}

export function getPlanIdFromProductId(productId: string): string {
  if (productId === STRIPE_CONFIG.products.pro.productId) {
    return "pro";
  }
  return "free";
}
