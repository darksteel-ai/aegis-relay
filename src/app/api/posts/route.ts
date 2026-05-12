import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildPlatformPostCreateInputs,
  parseCreateScheduledPostInput,
} from "@/lib/posts/create";

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

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const parsed = parseCreateScheduledPostInput(payload, {
    workspaceId: membership.workspaceId,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.errors[0] ?? "Invalid post request.", errors: parsed.errors },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const post = await db.$transaction(async (tx) => {
    const video = await tx.uploadedVideo.create({
      data: {
        workspaceId: membership.workspaceId,
        storageKey: input.video.storageKey,
        fileName: input.video.fileName,
        mimeType: input.video.mimeType,
        sizeBytes: input.video.sizeBytes,
        width: input.video.width,
        height: input.video.height,
        durationSec:
          input.video.durationSeconds == null
            ? undefined
            : Math.round(input.video.durationSeconds),
      },
    });

    return tx.scheduledPost.create({
      data: {
        workspaceId: membership.workspaceId,
        videoId: video.id,
        baseCaption: input.baseCaption,
        scheduledAt: input.scheduledAt,
        timezone: input.timezone,
        platformPosts: {
          create: buildPlatformPostCreateInputs(input),
        },
      },
      include: {
        video: true,
        platformPosts: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  });

  return NextResponse.json({ post }, { status: 201 });
}
