import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { resetRetryablePlatformPosts } from "@/lib/publishing/scheduler";

export const runtime = "nodejs";

type RetryRouteContext = {
  params: Promise<{
    postId: string;
  }>;
};

export async function POST(request: Request, { params }: RetryRouteContext) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  const result = await resetRetryablePlatformPosts({
    postId,
    userId: session.user.id,
  });

  if (!result.found) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL(`/posts/${postId}`, request.url), 303);
  }

  return NextResponse.json({ resetCount: result.resetCount });
}
