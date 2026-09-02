import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import {
  buildTikTokOAuthStartUrl,
  createTikTokOAuthNonce,
  createTikTokOAuthState,
  resolveTikTokRedirectUri,
  tiktokOAuthStateCookieName,
} from "@/lib/platforms/tiktok-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (!isConvexConfigured()) {
    return redirectToConnections(request, "storage-not-configured");
  }

  let workspace;

  try {
    workspace = await getConvexClient().query(convexApi.workspaces.getForUser, {
      userId: session.user.id,
    });
  } catch (error) {
    console.error("TikTok OAuth start could not load workspace.", error);
    return redirectToConnections(request, "workspace-unavailable");
  }

  if (!workspace) {
    return redirectToConnections(request, "no-workspace");
  }

  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return new Response("OAuth state signing is not configured.", { status: 503 });
  }

  const nonce = createTikTokOAuthNonce();
  const state = createTikTokOAuthState({
    userId: session.user.id,
    workspaceId: workspace.id,
    nonce,
    secret,
  });
  const oauthUrl = buildTikTokOAuthStartUrl(process.env, { state });

  if (!oauthUrl.success) {
    return new Response(
      "TikTok OAuth is not configured. Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, and TIKTOK_REDIRECT_URI.",
      { status: 503 },
    );
  }

  console.info("Starting TikTok OAuth with redirect_uri", resolveTikTokRedirectUri(process.env));

  const response = NextResponse.redirect(oauthUrl.url);
  response.cookies.set(tiktokOAuthStateCookieName, nonce, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function redirectToConnections(request: Request, tiktokStatus: string) {
  return NextResponse.redirect(new URL(`/connections?tiktok=${tiktokStatus}`, request.url));
}
