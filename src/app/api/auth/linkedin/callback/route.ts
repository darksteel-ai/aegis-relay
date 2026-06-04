import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import {
  completeLinkedInOAuthCallback,
  linkedInOAuthStateCookieName,
  verifyLinkedInOAuthState,
} from "@/lib/platforms/linkedin-oauth";

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
    console.error("LinkedIn OAuth callback could not load workspace.", error);
    return redirectToConnections(request, "workspace-unavailable");
  }

  if (!workspace) {
    return redirectToConnections(request, "no-workspace");
  }

  const url = new URL(request.url);
  const linkedInError = getLinkedInCallbackErrorMessage(url.searchParams);

  if (url.searchParams.get("error") || linkedInError) {
    return clearStateCookie(
      redirectToConnections(
        request,
        "oauth-failed",
        linkedInError ?? "LinkedIn did not approve the connection.",
      ),
    );
  }

  const code = url.searchParams.get("code")?.split("#")[0]?.trim();

  if (!code) {
    return clearStateCookie(
      redirectToConnections(
        request,
        "missing-code",
        "LinkedIn did not return a connection code.",
      ),
    );
  }

  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    return new Response("OAuth state signing is not configured.", { status: 503 });
  }

  const stateResult = verifyLinkedInOAuthState({
    state: url.searchParams.get("state"),
    nonce: getCookieValue(request.headers.get("cookie"), linkedInOAuthStateCookieName),
    userId: session.user.id,
    workspaceId: workspace.id,
    secret,
  });

  if (!stateResult.success) {
    return clearStateCookie(redirectToConnections(request, stateResult.reason));
  }

  let result;

  try {
    result = await completeLinkedInOAuthCallback({
      code,
      workspaceId: workspace.id,
      redirectUri: stateResult.redirectUri,
    });
  } catch (error) {
    console.error("LinkedIn OAuth callback failed.", error);
    return clearStateCookie(redirectToConnections(request, "oauth-failed"));
  }

  if (!result.success) {
    console.error("LinkedIn OAuth callback returned a handled failure.", {
      reason: result.reason,
      message: result.message,
    });
    return clearStateCookie(
      redirectToConnections(request, "oauth-failed", result.message),
    );
  }

  return clearStateCookie(redirectToConnections(request, "connected"));
}

function getLinkedInCallbackErrorMessage(searchParams: URLSearchParams) {
  return searchParams.get("error_description") ?? searchParams.get("error");
}

function redirectToConnections(request: Request, linkedInStatus: string, message?: string) {
  const url = new URL("/connections", request.url);
  url.searchParams.set("linkedin", linkedInStatus);

  if (message) {
    url.searchParams.set("linkedin_message", message);
  }

  return NextResponse.redirect(url);
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(linkedInOAuthStateCookieName, "", {
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
