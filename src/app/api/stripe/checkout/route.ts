import { NextResponse } from "next/server";

import { createSubscriptionCheckoutSession, BillingError } from "@/lib/billing/stripe";
import { getAuthSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { getPaidPricingPlan, type PaidPlanId } from "@/lib/billing/pricing";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData().catch(() => null);
    const requestedPlan = formData?.get("plan");
    const planId = typeof requestedPlan === "string" ? requestedPlan : "creator";
    const paidPlan = getPaidPricingPlan(planId);

    if (!paidPlan) {
      throw new BillingError("Choose a valid paid plan.", 400);
    }

    const checkout = await createSubscriptionCheckoutSession({
      user: session.user,
      appUrl: env.NEXTAUTH_URL,
      planId: paidPlan.id as PaidPlanId,
    });

    return NextResponse.redirect(checkout.url, { status: 303 });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
