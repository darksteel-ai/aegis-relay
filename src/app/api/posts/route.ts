import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { Platform } from "@/lib/domain";
import { parseCreateScheduledPostInput } from "@/lib/posts/create";
import type { Id } from "../../../../convex/_generated/dataModel";

export const runtime = "nodejs";

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

  const client = getConvexClient();
  const workspace = await client.query(convexApi.workspaces.getForUser, {
    userId: session.user.id,
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const parsed = parseCreateScheduledPostInput(payload, {
    workspaceId: workspace.id,
    userId: session.user.id,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.errors[0] ?? "Invalid post request.", errors: parsed.errors },
      { status: 400 },
    );
  }

  const input = parsed.data;
  let post;

  try {
    post = await client.mutation(convexApi.posts.createScheduledPost, {
      userId: session.user.id,
      workspaceId: workspace.id,
      baseCaption: input.baseCaption,
      youtubeTitle: input.youtubeTitle,
      hashtags: input.hashtags,
      scheduledAt: input.scheduledAt.getTime(),
      timezone: input.timezone,
      platforms: input.platforms,
      accountIdsByPlatform: castConnectedAccountSelections(input.accountIdsByPlatform),
      platformCaptions: input.platformCaptions,
      workflowStatus: input.workflowStatus,
      tiktokSettings: input.tiktokSettings,
      video: {
        ...input.video,
        existingVideoId: input.video.existingVideoId as Id<"uploadedVideos"> | undefined,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Upload reservation")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("Selected media")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("Monthly post limit")) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }

    if (error instanceof Error && error.message.includes("Selected account")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }

  return NextResponse.json({ post }, { status: 201 });
}

function castConnectedAccountSelections(
  selections: Partial<Record<Platform, string[]>>,
) {
  return {
    YOUTUBE: selections.YOUTUBE as Id<"connectedAccounts">[] | undefined,
    TIKTOK: selections.TIKTOK as Id<"connectedAccounts">[] | undefined,
    INSTAGRAM: selections.INSTAGRAM as Id<"connectedAccounts">[] | undefined,
  };
}
