import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import {
  buildYouTubeOAuthStartUrl,
  createYouTubeOAuthNonce,
  createYouTubeOAuthState,
  youtubeOAuthStateCookieName,
} from "@/lib/platforms/youtube-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const workspace = await getConvexClient().query(convexApi.workspaces.getForUser, {
    userId: session.user.id,
  });

  if (!workspace) {
    return redirectToConnections(request, "no-workspace");
  }

  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return new Response("OAuth state signing is not configured.", { status: 503 });
  }

  const nonce = createYouTubeOAuthNonce();
  const state = createYouTubeOAuthState({
    userId: session.user.id,
    workspaceId: workspace.id,
    nonce,
    secret,
  });
  const oauthUrl = buildYouTubeOAuthStartUrl(process.env, { state });

  if (!oauthUrl.success) {
    return new Response(
      "YouTube OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.",
      { status: 503 },
    );
  }

  const response = NextResponse.redirect(oauthUrl.url);
  response.cookies.set(youtubeOAuthStateCookieName, nonce, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function redirectToConnections(request: Request, youtubeStatus: string) {
  return NextResponse.redirect(new URL(`/connections?youtube=${youtubeStatus}`, request.url));
}
