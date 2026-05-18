import { NextResponse } from "next/server";

import { createSubscriptionCheckoutSession, BillingError } from "@/lib/billing/stripe";
import { getAuthSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { getPaidPricingPlan, type PaidPlanId } from "@/lib/billing/pricing";

type CheckoutErrorReason = "configuration" | "unavailable";

export function GET() {
  return NextResponse.redirect(new URL("/billing", env.NEXTAUTH_URL));
}

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
      return redirectToBillingError("configuration");
    }

    console.error("Stripe checkout failed", error);
    return redirectToBillingError(getStripeCheckoutErrorReason(error));
  }
}

function redirectToBillingError(reason: CheckoutErrorReason) {
  const url = new URL("/billing", env.NEXTAUTH_URL);
  url.searchParams.set("checkout", "failed");
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url, { status: 303 });
}

function getStripeCheckoutErrorReason(error: unknown): CheckoutErrorReason {
  if (isStripeResourceMissingError(error)) {
    return "configuration";
  }

  return "unavailable";
}

function isStripeResourceMissingError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "resource_missing"
  );
}
