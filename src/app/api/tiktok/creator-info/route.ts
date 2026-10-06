import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { Platform } from "@/lib/domain";
import { fetchTikTokCreatorInfo, resolveTikTokAccessToken } from "@/lib/platforms/tiktok";
import {
  getTikTokCreatorBlockMessage,
  isTikTokCreatorBlockedFromPosting,
} from "@/lib/platforms/tiktok-ux";

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
    const accessToken = await resolveTikTokAccessToken({
      id: account.id,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      expiresAt: account.expiresAt ? new Date(account.expiresAt) : null,
    });
    const creatorInfo = await fetchTikTokCreatorInfo(accessToken);
    const errorCode = creatorInfo.error?.code;

    if (isTikTokCreatorBlockedFromPosting(errorCode)) {
      return NextResponse.json({
        accountName: creatorInfo.data?.creator_nickname ?? account.accountName,
        creatorNickname: creatorInfo.data?.creator_nickname ?? account.accountName,
        creatorUsername: creatorInfo.data?.creator_username ?? null,
        creatorAvatarUrl: creatorInfo.data?.creator_avatar_url ?? null,
        externalId: account.externalId,
        privacyLevelOptions: creatorInfo.data?.privacy_level_options ?? [],
        commentDisabled: creatorInfo.data?.comment_disabled === true,
        duetDisabled: creatorInfo.data?.duet_disabled === true,
        stitchDisabled: creatorInfo.data?.stitch_disabled === true,
        maxVideoPostDurationSec: creatorInfo.data?.max_video_post_duration_sec ?? null,
        canPost: false,
        cannotPostReason: getTikTokCreatorBlockMessage(errorCode),
      });
    }

    return NextResponse.json({
      accountName: creatorInfo.data?.creator_nickname ?? account.accountName,
      creatorNickname: creatorInfo.data?.creator_nickname ?? account.accountName,
      creatorUsername: creatorInfo.data?.creator_username ?? null,
      creatorAvatarUrl: creatorInfo.data?.creator_avatar_url ?? null,
      externalId: account.externalId,
      privacyLevelOptions: creatorInfo.data?.privacy_level_options ?? [],
      commentDisabled: creatorInfo.data?.comment_disabled === true,
      duetDisabled: creatorInfo.data?.duet_disabled === true,
      stitchDisabled: creatorInfo.data?.stitch_disabled === true,
      maxVideoPostDurationSec: creatorInfo.data?.max_video_post_duration_sec ?? null,
      canPost: true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "TikTok creator settings could not be loaded.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
