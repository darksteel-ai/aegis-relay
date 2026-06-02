import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { Platform } from "@/lib/domain";
import { fetchTikTokCreatorInfo } from "@/lib/platforms/tiktok";
import { decryptConnectedAccountToken } from "@/lib/platforms/token-crypto";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = new URL(request.url).searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json({ error: "TikTok account id is required." }, { status: 400 });
  }

  const accounts = await getConvexClient().query(convexApi.connections.listPrivateForUser, {
    userId: session.user.id,
  });
  const account = accounts.find(
    (item) => item.id === accountId && item.platform === Platform.TIKTOK,
  );

  if (!account) {
    return NextResponse.json({ error: "TikTok account not found." }, { status: 404 });
  }

  try {
    const creatorInfo = await fetchTikTokCreatorInfo(
      decryptConnectedAccountToken(account.accessToken),
    );

    return NextResponse.json({
      accountName: account.accountName,
      externalId: account.externalId,
      privacyLevelOptions: creatorInfo.data?.privacy_level_options ?? [],
      commentDisabled: creatorInfo.data?.comment_disabled === true,
      duetDisabled: creatorInfo.data?.duet_disabled === true,
      stitchDisabled: creatorInfo.data?.stitch_disabled === true,
      maxVideoPostDurationSec: creatorInfo.data?.max_video_post_duration_sec ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TikTok creator info could not be loaded.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
