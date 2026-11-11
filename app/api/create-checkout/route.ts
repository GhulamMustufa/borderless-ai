import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStripe, resolveTrustedOrigin } from "@/lib/stripe";
import { getUserSubscription, upsertUserSubscription } from "@/lib/persistence";

export async function POST(req: Request) {
  const user = await currentUser();
  const { userId } = await auth();

  if (!user || !userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const origin = resolveTrustedOrigin(req);
  const priceId = process.env.STRIPE_PRO_PRICE_ID;

  if (!priceId) {
    return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 });
  }

  // Reuse existing Stripe customer if available.
  let customerId: string | undefined;
  const existing = await getUserSubscription(userId);
  if (existing?.stripeCustomerId) {
    customerId = existing.stripeCustomerId;
  }

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.emailAddresses[0]?.emailAddress || "",
      metadata: { userId },
    });
    customerId = customer.id;
    // Persist the new customer ID so subsequent checkouts reuse it.
    await upsertUserSubscription({
      userId,
      stripeCustomerId: customerId,
      plan: "free",
      status: "active",
    });
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgrade=success`,
    cancel_url: `${origin}/dashboard`,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  });

  return NextResponse.redirect(session.url!, 303);
}
