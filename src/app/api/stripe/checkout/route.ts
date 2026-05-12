import { NextResponse } from "next/server";

import { createSubscriptionCheckoutSession, BillingError } from "@/lib/billing/stripe";
import { getAuthSession } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const checkout = await createSubscriptionCheckoutSession({
      user: session.user,
      origin: new URL(request.url).origin,
    });

    return NextResponse.redirect(checkout.url, { status: 303 });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
