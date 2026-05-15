import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import {
  fetchInstagramPerformanceSignal,
  fetchTikTokPerformanceSignal,
  fetchYouTubePerformanceSignal,
  fetchYouTubeRecentUploads,
  optimizeMetadataWithOpenAI,
  type PlatformDataSignal,
} from "@/lib/ai/metadata-optimizer";
import { decryptConnectedAccountToken } from "@/lib/platforms/token-crypto";

export const runtime = "nodejs";

const requestSchema = z.object({
  caption: z.string().trim().min(1).max(2_200),
  youtubeTitle: z.string().trim().max(100).optional(),
  hashtags: z.string().trim().max(500).optional(),
});

type PrivateConnectedAccount = {
  platform: string;
  accountName?: string;
  externalId?: string;
  accessToken?: string;
  scopes?: string;
  updatedAt: number;
};

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
  const accounts = (await client.query(convexApi.connections.listPrivateForUser, {
    userId: session.user.id,
  })) as PrivateConnectedAccount[];
  const youtubeAccount = accounts
    .filter((account) => account.platform === "YOUTUBE")
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  if (!youtubeAccount?.externalId) {
    return NextResponse.json(
      { error: "Connect YouTube before using AI metadata optimization." },
      { status: 400 },
    );
  }

  try {
    const platformSignals = await collectPlatformSignals(accounts);
    const youtubeSignal = platformSignals.find((signal) => signal.platform === "YouTube");
    const recentUploads =
      youtubeSignal?.recentItems.map((item) => ({
        title: item.title ?? item.caption ?? "Untitled video",
        url: item.url ?? "",
        publishedAt: item.publishedAt,
        metrics: item.metrics,
      })) ?? (await fetchYouTubeRecentUploads(youtubeAccount.externalId));
    const result = await optimizeMetadataWithOpenAI({
      caption: parsed.data.caption,
      currentTitle: parsed.data.youtubeTitle,
      currentHashtags: parsed.data.hashtags,
      channelName: youtubeAccount.accountName,
      recentUploads,
      platformSignals,
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

async function collectPlatformSignals(accounts: PrivateConnectedAccount[]) {
  const latestByPlatform = new Map<string, PrivateConnectedAccount>();

  for (const account of accounts) {
    const existing = latestByPlatform.get(account.platform);

    if (!existing || account.updatedAt > existing.updatedAt) {
      latestByPlatform.set(account.platform, account);
    }
  }

  const signals: PlatformDataSignal[] = [];
  const youtubeAccount = latestByPlatform.get("YOUTUBE");
  const tiktokAccount = latestByPlatform.get("TIKTOK");
  const instagramAccount = latestByPlatform.get("INSTAGRAM");

  if (youtubeAccount?.externalId) {
    signals.push(
      await fetchYouTubePerformanceSignal({
        channelId: youtubeAccount.externalId,
        accountName: youtubeAccount.accountName,
        accessToken: decryptAccountToken(youtubeAccount.accessToken),
      }),
    );
  }

  if (tiktokAccount) {
    signals.push(
      await fetchTikTokPerformanceSignal({
        accountName: tiktokAccount.accountName,
        accessToken: decryptAccountToken(tiktokAccount.accessToken),
        scopes: tiktokAccount.scopes,
      }),
    );
  }

  if (instagramAccount) {
    signals.push(
      await fetchInstagramPerformanceSignal({
        accountName: instagramAccount.accountName,
        accessToken: decryptAccountToken(instagramAccount.accessToken),
      }),
    );
  }

  return signals;
}

function decryptAccountToken(token: string | undefined) {
  return token ? decryptConnectedAccountToken(token) : undefined;
}
