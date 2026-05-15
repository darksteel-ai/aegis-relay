import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import {
  fetchYouTubeRecentUploads,
  optimizeMetadataWithOpenAI,
} from "@/lib/ai/metadata-optimizer";

export const runtime = "nodejs";

const requestSchema = z.object({
  caption: z.string().trim().min(1).max(2_200),
  youtubeTitle: z.string().trim().max(100).optional(),
  hashtags: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add a caption before optimizing metadata." },
      { status: 400 },
    );
  }

  const client = getConvexClient();
  const accounts = await client.query(convexApi.connections.listForUser, {
    userId: session.user.id,
  });
  const youtubeAccount = accounts
    .filter((account: { platform: string }) => account.platform === "YOUTUBE")
    .sort((a: { updatedAt: number }, b: { updatedAt: number }) => b.updatedAt - a.updatedAt)[0];

  if (!youtubeAccount?.externalId) {
    return NextResponse.json(
      { error: "Connect YouTube before using AI metadata optimization." },
      { status: 400 },
    );
  }

  try {
    const recentUploads = await fetchYouTubeRecentUploads(youtubeAccount.externalId);
    const result = await optimizeMetadataWithOpenAI({
      caption: parsed.data.caption,
      currentTitle: parsed.data.youtubeTitle,
      currentHashtags: parsed.data.hashtags,
      channelName: youtubeAccount.accountName,
      recentUploads,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI optimization failed. Please try again.",
      },
      { status: 500 },
    );
  }
}
