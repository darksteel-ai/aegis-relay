import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { BillingError, createBillingPortalSession } from "@/lib/billing/stripe";
import { env } from "@/lib/env";

export async function POST() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const portal = await createBillingPortalSession({
      user: session.user,
      appUrl: env.NEXTAUTH_URL,
    });

    return NextResponse.redirect(portal.url, { status: 303 });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
