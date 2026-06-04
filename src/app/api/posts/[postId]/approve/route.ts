import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export const runtime = "nodejs";

type ApproveRouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(request: Request, { params }: ApproveRouteContext) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  try {
    const post = await getConvexClient().mutation(convexApi.posts.approve, {
      userId: session.user.id,
      postId: postId as Id<"scheduledPosts">,
    });

    return NextResponse.redirect(new URL(`/posts/${post?.id ?? postId}`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Post could not be approved.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
