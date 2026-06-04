import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { ZodError } from "zod";
import type { Id } from "../../../convex/_generated/dataModel";

import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { Platform, PublishStatus } from "@/lib/domain";
import { getLinkedInEnv, getPlatformTokenEnv } from "@/lib/env";
import { encryptConnectedAccountToken } from "@/lib/platforms/token-crypto";

type EnvSource = Record<string, string | undefined>;
type ConsoleLike = Pick<typeof console, "error" | "info">;

type LinkedInOAuthStartUrlResult =
  | { success: true; url: string }
  | { success: false; reason: "config-error" };

type LinkedInTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

type LinkedInUserInfo = {
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  error?: string;
  error_description?: string;
};

const linkedInOAuthScopes = ["openid", "profile", "w_member_social"] as const;
const linkedInDefaultScope = linkedInOAuthScopes.join(" ");
export const linkedInOAuthStateCookieName = "linkedin_oauth_state";
const linkedInOAuthStateTtlMs = 10 * 60 * 1000;

export function getLinkedInOAuthRedirectUri(source: EnvSource = process.env) {
  return getLinkedInEnv(source).LINKEDIN_REDIRECT_URI;
}

export function buildLinkedInOAuthStartUrl(
  source: EnvSource = process.env,
  options: { state?: string } = {},
): LinkedInOAuthStartUrlResult {
  let env;

  try {
    env = getLinkedInEnv(source);
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, reason: "config-error" };
    }

    throw error;
  }

  if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET || !env.LINKEDIN_REDIRECT_URI) {
    return { success: false, reason: "config-error" };
  }

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.LINKEDIN_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.LINKEDIN_REDIRECT_URI);
  url.searchParams.set("scope", linkedInDefaultScope);

  if (options.state) {
    url.searchParams.set("state", options.state);
  }

  return { success: true, url: url.toString() };
}

export function createLinkedInOAuthNonce() {
  return randomBytes(24).toString("base64url");
}

export function createLinkedInOAuthState({
  userId,
  workspaceId,
  nonce,
  secret,
  redirectUri,
  now = new Date(),
}: {
  userId: string;
  workspaceId: string;
  nonce: string;
  secret: string;
  redirectUri?: string;
  now?: Date;
}) {
  const payload = {
    userId,
    workspaceId,
    nonce,
    redirectUri,
    expiresAt: now.getTime() + linkedInOAuthStateTtlMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signState(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyLinkedInOAuthState({
  state,
  nonce,
  userId,
  workspaceId,
  secret,
  now = new Date(),
}: {
  state: string | null | undefined;
  nonce: string | null | undefined;
  userId: string;
  workspaceId: string;
  secret: string;
  now?: Date;
}):
  | { success: true; userId: string; workspaceId: string; redirectUri?: string }
  | { success: false; reason: "missing-state" | "invalid-state" } {
  if (!state || !nonce) {
    return { success: false, reason: "missing-state" };
  }

  const [encodedPayload, signature] = state.split(".");

  if (!encodedPayload || !signature) {
    return { success: false, reason: "invalid-state" };
  }

  const expectedSignature = signState(encodedPayload, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return { success: false, reason: "invalid-state" };
  }

  let payload: {
    userId?: unknown;
    workspaceId?: unknown;
    nonce?: unknown;
    redirectUri?: unknown;
    expiresAt?: unknown;
  };

  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return { success: false, reason: "invalid-state" };
  }

  if (
    payload.userId !== userId ||
    payload.workspaceId !== workspaceId ||
    payload.nonce !== nonce ||
    typeof payload.expiresAt !== "number" ||
    payload.expiresAt < now.getTime()
  ) {
    return { success: false, reason: "invalid-state" };
  }

  return {
    success: true,
    userId,
    workspaceId,
    redirectUri: typeof payload.redirectUri === "string" ? payload.redirectUri : undefined,
  };
}

export async function completeLinkedInOAuthCallback({
  code,
  workspaceId,
  env = process.env,
  db,
  redirectUri,
  logger = console,
  exchangeCodeForToken = exchangeLinkedInCodeForToken,
  fetchUserInfo = fetchLinkedInUserInfo,
}: {
  code: string;
  workspaceId: string;
  env?: EnvSource;
  db?: {
    connectedAccount: {
      upsert(args: {
        workspaceId: string;
        platform: Platform;
        accountName: string;
        externalId: string;
        accessToken: string;
        refreshToken?: string;
        expiresAt: number | null;
        scopes: string;
        status: PublishStatus;
      }): Promise<string>;
    };
  };
  redirectUri?: string;
  logger?: ConsoleLike;
  exchangeCodeForToken?: (
    code: string,
    env: EnvSource,
    redirectUri?: string,
    logger?: ConsoleLike,
  ) => Promise<LinkedInTokenResponse>;
  fetchUserInfo?: (accessToken: string) => Promise<LinkedInUserInfo>;
}): Promise<
  | { success: true; accountId: string }
  | {
      success: false;
      reason: "config-error" | "missing-token" | "missing-profile";
      message: string;
    }
> {
  try {
    getLinkedInEnv(env);
    getPlatformTokenEnv(env);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        reason: "config-error",
        message: "LinkedIn OAuth token storage is not configured.",
      };
    }

    throw error;
  }

  const token = await exchangeCodeForToken(code, env, redirectUri, logger);

  if (!token.access_token) {
    return {
      success: false,
      reason: "missing-token",
      message:
        token.error_description ??
        token.error ??
        "LinkedIn did not return an access token.",
    };
  }

  const profile = await fetchUserInfo(token.access_token);

  if (!profile.sub) {
    return {
      success: false,
      reason: "missing-profile",
      message:
        profile.error_description ??
        profile.error ??
        "LinkedIn did not return a member profile id.",
    };
  }

  const nameFromParts = [profile.given_name, profile.family_name].filter(Boolean).join(" ");
  const profileName = (profile.name ?? nameFromParts) || "LinkedIn member";
  const accountWrite = {
    workspaceId,
    platform: Platform.LINKEDIN,
    accountName: profileName,
    externalId: profile.sub,
    accessToken: encryptConnectedAccountToken(token.access_token, env),
    refreshToken: token.refresh_token
      ? encryptConnectedAccountToken(token.refresh_token, env)
      : undefined,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : null,
    scopes: token.scope ?? linkedInDefaultScope,
    status: PublishStatus.SCHEDULED,
  };
  const accountId = db
    ? await db.connectedAccount.upsert(accountWrite)
    : await getConvexClient().mutation(convexApi.connections.upsert, {
        ...accountWrite,
        workspaceId: workspaceId as Id<"workspaces">,
        expiresAt: accountWrite.expiresAt ?? undefined,
      });

  return { success: true, accountId };
}

async function exchangeLinkedInCodeForToken(
  code: string,
  envSource: EnvSource,
  redirectUriOverride?: string,
  logger: ConsoleLike = console,
) {
  const env = getLinkedInEnv(envSource);
  const redirectUri = redirectUriOverride ?? env.LINKEDIN_REDIRECT_URI;

  if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET || !redirectUri) {
    throw new Error("LinkedIn OAuth is not configured.");
  }

  logger.info("LinkedIn token exchange started.", {
    redirectUriHost: safeUrlHost(redirectUri),
    redirectUriPath: safeUrlPath(redirectUri),
    codeLength: code.length,
  });

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: env.LINKEDIN_CLIENT_ID,
    client_secret: env.LINKEDIN_CLIENT_SECRET,
  });

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const token = (await response.json()) as LinkedInTokenResponse;

  if (!token.access_token) {
    logger.error("LinkedIn token exchange failed.", {
      status: response.status,
      error: token.error,
      description: token.error_description,
    });
  }

  return token;
}

async function fetchLinkedInUserInfo(accessToken: string) {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return (await response.json()) as LinkedInUserInfo;
}

function safeUrlHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "invalid-url";
  }
}

function safeUrlPath(value: string) {
  try {
    return new URL(value).pathname;
  } catch {
    return "invalid-url";
  }
}

function signState(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  return (
    valueBuffer.byteLength === expectedBuffer.byteLength &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  );
}
