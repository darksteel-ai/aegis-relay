import { NextResponse } from "next/server";

import { createSubscriptionCheckoutSession, BillingError } from "@/lib/billing/stripe";
import { getAuthSession } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const checkout = await createSubscriptionCheckoutSession({
      user: session.user,
      appUrl: env.NEXTAUTH_URL,
    });

    return NextResponse.redirect(checkout.url, { status: 303 });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
