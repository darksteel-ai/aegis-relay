import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { ZodError } from "zod";
import type { Id } from "../../../convex/_generated/dataModel";

import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { Platform, PublishStatus } from "@/lib/domain";
import { getPlatformTokenEnv, getTikTokEnv } from "@/lib/env";
import { encryptConnectedAccountToken } from "@/lib/platforms/token-crypto";

type EnvSource = Record<string, string | undefined>;

type TikTokOAuthStartUrlResult =
  | {
      success: true;
      url: string;
    }
  | {
      success: false;
      reason: "config-error";
    };

type TikTokTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type TikTokUserInfoResponse = {
  data?: {
    user?: {
      open_id?: string;
      display_name?: string;
      avatar_url?: string;
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
};

const tiktokOAuthScopes = ["user.info.basic", "user.info.stats", "video.publish", "video.upload"] as const;
const tiktokDefaultScope = tiktokOAuthScopes.join(",");
export const tiktokOAuthStateCookieName = "tiktok_oauth_state";
const tiktokOAuthStateTtlMs = 10 * 60 * 1000;

export function buildTikTokOAuthStartUrl(
  source: EnvSource = process.env,
  options: { state?: string } = {},
): TikTokOAuthStartUrlResult {
  let tiktokEnv;

  try {
    tiktokEnv = getTikTokEnv(source);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        reason: "config-error",
      };
    }

    throw error;
  }

  if (
    !tiktokEnv.TIKTOK_CLIENT_KEY ||
    !tiktokEnv.TIKTOK_CLIENT_SECRET ||
    !tiktokEnv.TIKTOK_REDIRECT_URI
  ) {
    return {
      success: false,
      reason: "config-error",
    };
  }

  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", tiktokEnv.TIKTOK_CLIENT_KEY);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", tiktokDefaultScope);
  url.searchParams.set("redirect_uri", tiktokEnv.TIKTOK_REDIRECT_URI);

  if (options.state) {
    url.searchParams.set("state", options.state);
  }

  return {
    success: true,
    url: url.toString(),
  };
}

export function createTikTokOAuthNonce() {
  return randomBytes(24).toString("base64url");
}

export function createTikTokOAuthState({
  userId,
  workspaceId,
  nonce,
  secret,
  now = new Date(),
}: {
  userId: string;
  workspaceId: string;
  nonce: string;
  secret: string;
  now?: Date;
}) {
  const payload = {
    userId,
    workspaceId,
    nonce,
    expiresAt: now.getTime() + tiktokOAuthStateTtlMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signState(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyTikTokOAuthState({
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
  | {
      success: true;
      userId: string;
      workspaceId: string;
    }
  | {
      success: false;
      reason: "missing-state" | "invalid-state";
    } {
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
  };
}

export async function completeTikTokOAuthCallback({
  code,
  workspaceId,
  env = process.env,
  exchangeCodeForTokens = exchangeTikTokCodeForTokens,
  fetchUserInfo = fetchTikTokUserInfo,
}: {
  code: string;
  workspaceId: string;
  env?: EnvSource;
  exchangeCodeForTokens?: (code: string, env: EnvSource) => Promise<TikTokTokenResponse>;
  fetchUserInfo?: (accessToken: string) => Promise<TikTokUserInfoResponse>;
}): Promise<
  | {
      success: true;
      accountId: string;
    }
  | {
      success: false;
      reason: "config-error" | "missing-token" | "missing-account";
      message: string;
    }
> {
  try {
    getTikTokEnv(env);
    getPlatformTokenEnv(env);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        reason: "config-error",
        message: "TikTok OAuth token storage is not configured.",
      };
    }

    throw error;
  }

  const tokens = await exchangeCodeForTokens(code, env);

  if (!tokens.access_token || !tokens.open_id) {
    return {
      success: false,
      reason: "missing-token",
      message: tokens.error_description ?? "TikTok did not return an access token.",
    };
  }

  const userInfo = await fetchUserInfo(tokens.access_token);
  const user = userInfo.data?.user;
  const externalId = user?.open_id ?? tokens.open_id;

  if (!externalId) {
    return {
      success: false,
      reason: "missing-account",
      message: userInfo.error?.message ?? "TikTok did not return account details.",
    };
  }

  const account = await getConvexClient().mutation(convexApi.connections.upsert, {
    workspaceId: workspaceId as Id<"workspaces">,
    platform: Platform.TIKTOK,
    accountName: user?.display_name ?? "TikTok account",
    externalId,
    accessToken: encryptConnectedAccountToken(tokens.access_token, env),
    refreshToken: tokens.refresh_token
      ? encryptConnectedAccountToken(tokens.refresh_token, env)
      : undefined,
    expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
    scopes: tokens.scope ?? tiktokDefaultScope,
    status: PublishStatus.SCHEDULED,
  });

  return {
    success: true,
    accountId: account,
  };
}

async function exchangeTikTokCodeForTokens(code: string, env: EnvSource) {
  const tiktokEnv = getTikTokEnv(env);

  if (
    !tiktokEnv.TIKTOK_CLIENT_KEY ||
    !tiktokEnv.TIKTOK_CLIENT_SECRET ||
    !tiktokEnv.TIKTOK_REDIRECT_URI
  ) {
    throw new Error("TikTok OAuth is not configured.");
  }

  const body = new URLSearchParams({
    client_key: tiktokEnv.TIKTOK_CLIENT_KEY,
    client_secret: tiktokEnv.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: tiktokEnv.TIKTOK_REDIRECT_URI,
  });
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return (await response.json()) as TikTokTokenResponse;
}

async function fetchTikTokUserInfo(accessToken: string) {
  const url = new URL("https://open.tiktokapis.com/v2/user/info/");
  url.searchParams.set("fields", "open_id,display_name,avatar_url");
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return (await response.json()) as TikTokUserInfoResponse;
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
