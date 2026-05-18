import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getStripe, handleStripeEvent } from "@/lib/billing/stripe";
import { getStripeEnv } from "@/lib/env";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const body = await request.text();
  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      getStripeEnv().STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
    }

    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  await handleStripeEvent(event);

  return NextResponse.json({ received: true });
}
