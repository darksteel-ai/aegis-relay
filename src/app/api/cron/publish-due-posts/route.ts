import { NextResponse } from "next/server";

import { publishDuePosts } from "@/lib/publishing/scheduler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await publishDuePosts();

  return NextResponse.json({
    ok: true,
    processed: result.processed,
  });
}
