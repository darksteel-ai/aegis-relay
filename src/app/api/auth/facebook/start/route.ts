import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import {
  buildFacebookOAuthStartUrl,
  createFacebookOAuthNonce,
  createFacebookOAuthState,
  facebookOAuthStateCookieName,
  getFacebookOAuthRedirectUri,
} from "@/lib/platforms/facebook-oauth";

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
    console.error("Facebook OAuth start could not load workspace.", error);
    return redirectToConnections(request, "workspace-unavailable");
  }

  if (!workspace) {
    return redirectToConnections(request, "no-workspace");
  }

  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return new Response("OAuth state signing is not configured.", { status: 503 });
  }

  const nonce = createFacebookOAuthNonce();
  const redirectUri = getFacebookOAuthRedirectUri(process.env);
  const state = createFacebookOAuthState({
    userId: session.user.id,
    workspaceId: workspace.id,
    nonce,
    secret,
    redirectUri,
  });
  const oauthUrl = buildFacebookOAuthStartUrl(process.env, { state });

  if (!oauthUrl.success) {
    return new Response(
      "Facebook OAuth is not configured. Set FACEBOOK_REDIRECT_URI and Meta app credentials.",
      { status: 503 },
    );
  }

  const response = NextResponse.redirect(oauthUrl.url);
  response.cookies.set(facebookOAuthStateCookieName, nonce, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

function redirectToConnections(request: Request, facebookStatus: string) {
  return NextResponse.redirect(new URL(`/connections?facebook=${facebookStatus}`, request.url));
}
