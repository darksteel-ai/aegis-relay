import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import {
  buildInstagramOAuthStartUrl,
  createInstagramOAuthNonce,
  createInstagramOAuthState,
  getInstagramOAuthRedirectUri,
  instagramOAuthStateCookieName,
} from "@/lib/platforms/instagram-oauth";

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
    console.error("Instagram OAuth start could not load workspace.", error);
    return redirectToConnections(request, "workspace-unavailable");
  }

  if (!workspace) {
    return redirectToConnections(request, "no-workspace");
  }

  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return new Response("OAuth state signing is not configured.", { status: 503 });
  }

  const nonce = createInstagramOAuthNonce();
  const redirectUri = getInstagramOAuthRedirectUri(process.env);
  const state = createInstagramOAuthState({
    userId: session.user.id,
    workspaceId: workspace.id,
    nonce,
    secret,
    redirectUri,
  });
  const oauthUrl = buildInstagramOAuthStartUrl(process.env, { state });

  if (!oauthUrl.success) {
    return new Response(
      "Instagram OAuth is not configured. Set META_APP_ID, META_APP_SECRET, and INSTAGRAM_REDIRECT_URI.",
      { status: 503 },
    );
  }

  const response = NextResponse.redirect(oauthUrl.url);
  response.cookies.set(instagramOAuthStateCookieName, nonce, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function redirectToConnections(request: Request, instagramStatus: string) {
  return NextResponse.redirect(new URL(`/connections?instagram=${instagramStatus}`, request.url));
}
