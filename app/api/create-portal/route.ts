import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe, resolveTrustedOrigin } from "@/lib/stripe";
import { getUserSubscription } from "@/lib/persistence";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const subscription = await getUserSubscription(userId);
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  const origin = resolveTrustedOrigin(req);

  const session = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.redirect(session.url, 303);
}
