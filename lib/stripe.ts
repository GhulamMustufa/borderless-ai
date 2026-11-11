import Stripe from "stripe";

export const FREE_MONTHLY_LIMIT = 5;

export const PLANS = {
  free: { name: "Free", assessmentsPerMonth: FREE_MONTHLY_LIMIT, price: 0 },
  pro: { name: "Pro", assessmentsPerMonth: Infinity, price: 9 },
} as const;

// Lazy-initialised so the module can be imported in tests without a real key.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return _stripe;
}

// Convenience re-export used by the webhook and checkout routes.
export { _stripe as stripe };

/**
 * Resolves a safe redirect origin for Stripe Checkout & Billing Portal sessions.
 * Never trusts an arbitrary Origin header (prevents open-redirect spoofing).
 */
export function resolveTrustedOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let configuredOrigin = "http://localhost:3000";
  if (configured) {
    try {
      configuredOrigin = new URL(configured).origin;
    } catch {
      configuredOrigin = "http://localhost:3000";
    }
  }

  const allowedOrigins = new Set<string>([configuredOrigin]);
  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://127.0.0.1:3000");
    allowedOrigins.add("http://localhost:3001");
    allowedOrigins.add("http://127.0.0.1:3001");
  }

  const headerOrigin = req.headers.get("origin");
  if (headerOrigin) {
    try {
      const parsed = new URL(headerOrigin).origin;
      if (allowedOrigins.has(parsed)) {
        return parsed;
      }
    } catch {
      // Ignore malformed origin header
    }
  }

  return configuredOrigin;
}
