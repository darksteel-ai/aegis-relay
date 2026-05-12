import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  completeYouTubeOAuthCallback,
  verifyYouTubeOAuthState,
  youtubeOAuthStateCookieName,
} from "@/lib/platforms/youtube-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  });

  if (!membership) {
    return redirectToConnections(request, "no-workspace");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirectToConnections(request, "missing-code");
  }

  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return new Response("OAuth state signing is not configured.", { status: 503 });
  }

  const stateResult = verifyYouTubeOAuthState({
    state: url.searchParams.get("state"),
    nonce: getCookieValue(request.headers.get("cookie"), youtubeOAuthStateCookieName),
    userId: session.user.id,
    workspaceId: membership.workspaceId,
    secret,
  });

  if (!stateResult.success) {
    return clearStateCookie(redirectToConnections(request, stateResult.reason));
  }

  let result;

  try {
    result = await completeYouTubeOAuthCallback({
      code,
      workspaceId: membership.workspaceId,
    });
  } catch (error) {
    console.error("YouTube OAuth callback failed.", error);
    return clearStateCookie(redirectToConnections(request, "oauth-failed"));
  }

  if (!result.success) {
    return clearStateCookie(redirectToConnections(request, result.reason));
  }

  return clearStateCookie(redirectToConnections(request, "connected"));
}

function redirectToConnections(request: Request, youtubeStatus: string) {
  return NextResponse.redirect(new URL(`/connections?youtube=${youtubeStatus}`, request.url));
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(youtubeOAuthStateCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const cookie = cookies.find((item) => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}
