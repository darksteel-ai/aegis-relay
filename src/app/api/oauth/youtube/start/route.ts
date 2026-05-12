import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildYouTubeOAuthStartUrl } from "@/lib/platforms/youtube-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  });

  if (!membership) {
    redirect("/connections?youtube=no-workspace");
  }

  const oauthUrl = buildYouTubeOAuthStartUrl();

  if (!oauthUrl.success) {
    return new Response(
      "YouTube OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.",
      { status: 503 },
    );
  }

  redirect(oauthUrl.url);
}
