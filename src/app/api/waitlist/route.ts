import { NextResponse } from "next/server";

import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import { parseWaitlistInput } from "@/lib/validation/waitlist";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseWaitlistInput(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.errors[0] ?? "Invalid signup request.", errors: parsed.errors },
      { status: 400 },
    );
  }

  if (!isConvexConfigured()) {
    return NextResponse.json(
      { error: "Signups are temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const result = await getConvexClient().mutation(convexApi.waitlist.join, {
    email: parsed.data.email,
    niche: parsed.data.niche,
    source: parsed.data.source,
  });

  return NextResponse.json(
    { alreadyJoined: result.alreadyJoined },
    { status: result.alreadyJoined ? 200 : 201 },
  );
}
