import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import {
  completeInstagramOAuthCallback,
  instagramOAuthStateCookieName,
  verifyInstagramOAuthState,
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
    console.error("Instagram OAuth callback could not load workspace.", error);
    return redirectToConnections(request, "workspace-unavailable");
  }

  if (!workspace) {
    return redirectToConnections(request, "no-workspace");
  }

  const url = new URL(request.url);
  const error = url.searchParams.get("error");

  if (error) {
    console.error("Instagram OAuth callback returned an error.", {
      error,
      description: url.searchParams.get("error_description"),
    });
    return clearStateCookie(redirectToConnections(request, "oauth-failed"));
  }

  const code = cleanInstagramAuthorizationCode(url.searchParams.get("code"));

  if (!code) {
    return redirectToConnections(request, "missing-code");
  }

  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return new Response("OAuth state signing is not configured.", { status: 503 });
  }

  const stateResult = verifyInstagramOAuthState({
    state: url.searchParams.get("state"),
    nonce: getCookieValue(request.headers.get("cookie"), instagramOAuthStateCookieName),
    userId: session.user.id,
    workspaceId: workspace.id,
    secret,
  });

  if (!stateResult.success) {
    return clearStateCookie(redirectToConnections(request, stateResult.reason));
  }

  let result;

  try {
    result = await completeInstagramOAuthCallback({
      code,
      workspaceId: workspace.id,
      redirectUri: stateResult.redirectUri,
    });
  } catch (error) {
    console.error("Instagram OAuth callback failed.", error);
    return clearStateCookie(redirectToConnections(request, "oauth-failed"));
  }

  if (!result.success) {
    console.error("Instagram OAuth callback returned a handled failure.", {
      reason: result.reason,
      message: result.message,
    });
    return clearStateCookie(
      redirectToConnections(request, "oauth-failed", result.message),
    );
  }

  return clearStateCookie(redirectToConnections(request, "connected"));
}

function cleanInstagramAuthorizationCode(code: string | null) {
  return code?.split("#")[0]?.trim() ?? null;
}

function redirectToConnections(
  request: Request,
  instagramStatus: string,
  message?: string,
) {
  const url = new URL("/connections", request.url);
  url.searchParams.set("instagram", instagramStatus);

  if (message) {
    url.searchParams.set("instagram_message", message);
  }

  return NextResponse.redirect(url);
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(instagramOAuthStateCookieName, "", {
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
