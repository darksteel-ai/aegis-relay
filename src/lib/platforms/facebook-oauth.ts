import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { ZodError } from "zod";
import type { Id } from "../../../convex/_generated/dataModel";

import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { Platform, PublishStatus } from "@/lib/domain";
import { getFacebookEnv, getInstagramEnv, getPlatformTokenEnv } from "@/lib/env";
import { encryptConnectedAccountToken } from "@/lib/platforms/token-crypto";

type EnvSource = Record<string, string | undefined>;
type ConsoleLike = Pick<typeof console, "error" | "info">;

type FacebookOAuthStartUrlResult =
  | { success: true; url: string }
  | { success: false; reason: "config-error" };

type FacebookOAuthCredentials = {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
};

type FacebookTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

type FacebookPagesResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    access_token?: string;
    tasks?: string[];
    picture?: {
      data?: {
        url?: string;
      };
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

export type FacebookPageCandidate = {
  pageId: string;
  pageName: string;
  accessToken: string;
};

const graphApiVersion = "v24.0";
const facebookOAuthScopes = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
] as const;
const facebookDefaultScope = facebookOAuthScopes.join(",");
export const facebookOAuthStateCookieName = "facebook_oauth_state";
const facebookOAuthStateTtlMs = 10 * 60 * 1000;

function getFacebookOAuthCredentials(source: EnvSource): FacebookOAuthCredentials {
  const facebookEnv = getFacebookEnv(source);
  const instagramEnv = getInstagramEnv(source);

  return {
    clientId: facebookEnv.FACEBOOK_APP_ID ?? instagramEnv.META_APP_ID ?? instagramEnv.INSTAGRAM_APP_ID,
    clientSecret:
      facebookEnv.FACEBOOK_APP_SECRET ??
      instagramEnv.META_APP_SECRET ??
      instagramEnv.INSTAGRAM_APP_SECRET,
    redirectUri: facebookEnv.FACEBOOK_REDIRECT_URI,
  };
}

export function getFacebookOAuthRedirectUri(source: EnvSource = process.env) {
  return getFacebookOAuthCredentials(source).redirectUri;
}

export function buildFacebookOAuthStartUrl(
  source: EnvSource = process.env,
  options: { state?: string } = {},
): FacebookOAuthStartUrlResult {
  let credentials;

  try {
    credentials = getFacebookOAuthCredentials(source);
  } catch (error) {
    if (error instanceof ZodError) {
      return { success: false, reason: "config-error" };
    }

    throw error;
  }

  if (!credentials.clientId || !credentials.clientSecret || !credentials.redirectUri) {
    return { success: false, reason: "config-error" };
  }

  const url = new URL(`https://www.facebook.com/${graphApiVersion}/dialog/oauth`);
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("redirect_uri", credentials.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", facebookDefaultScope);

  if (options.state) {
    url.searchParams.set("state", options.state);
  }

  return { success: true, url: url.toString() };
}

export function createFacebookOAuthNonce() {
  return randomBytes(24).toString("base64url");
}

export function createFacebookOAuthState({
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
    expiresAt: now.getTime() + facebookOAuthStateTtlMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signState(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyFacebookOAuthState({
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

export async function completeFacebookOAuthCallback({
  code,
  workspaceId,
  env = process.env,
  db,
  redirectUri,
  logger = console,
  exchangeCodeForToken = exchangeFacebookCodeForToken,
  fetchFacebookPages = fetchFacebookPagesForToken,
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
  ) => Promise<FacebookTokenResponse>;
  fetchFacebookPages?: (accessToken: string) => Promise<FacebookPageCandidate[]>;
}): Promise<
  | { success: true; accountIds: string[] }
  | {
      success: false;
      reason: "config-error" | "missing-token" | "missing-page";
      message: string;
    }
> {
  try {
    getFacebookEnv(env);
    getInstagramEnv(env);
    getPlatformTokenEnv(env);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        reason: "config-error",
        message: "Facebook OAuth token storage is not configured.",
      };
    }

    throw error;
  }

  const token = await exchangeCodeForToken(code, env, redirectUri, logger);

  if (!token.access_token) {
    return {
      success: false,
      reason: "missing-token",
      message: token.error?.message ?? "Facebook did not return an access token.",
    };
  }

  const pages = await fetchFacebookPages(token.access_token);

  if (pages.length === 0) {
    return {
      success: false,
      reason: "missing-page",
      message:
        "Facebook did not return any Pages you can manage. Connect a Facebook account with Page access.",
    };
  }

  const accountIds: string[] = [];

  for (const page of pages) {
    const accountWrite = {
      workspaceId,
      platform: Platform.FACEBOOK,
      accountName: page.pageName,
      externalId: page.pageId,
      accessToken: encryptConnectedAccountToken(page.accessToken, env),
      refreshToken: undefined,
      expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : null,
      scopes: facebookDefaultScope,
      status: PublishStatus.SCHEDULED,
    };
    const accountId = db
      ? await db.connectedAccount.upsert(accountWrite)
      : await getConvexClient().mutation(convexApi.connections.upsert, {
          ...accountWrite,
          workspaceId: workspaceId as Id<"workspaces">,
          expiresAt: accountWrite.expiresAt ?? undefined,
        });

    accountIds.push(accountId);
  }

  return { success: true, accountIds };
}

async function exchangeFacebookCodeForToken(
  code: string,
  env: EnvSource,
  redirectUriOverride?: string,
  logger: ConsoleLike = console,
) {
  const credentials = getFacebookOAuthCredentials(env);
  const redirectUri = redirectUriOverride ?? credentials.redirectUri;

  if (!credentials.clientId || !credentials.clientSecret || !redirectUri) {
    throw new Error("Facebook OAuth is not configured.");
  }

  logger.info("Facebook token exchange started.", {
    redirectUriHost: safeUrlHost(redirectUri),
    redirectUriPath: safeUrlPath(redirectUri),
    codeLength: code.length,
  });

  const url = new URL(`https://graph.facebook.com/${graphApiVersion}/oauth/access_token`);
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("client_secret", credentials.clientSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const response = await fetch(url);
  const token = (await response.json()) as FacebookTokenResponse;

  if (!token.access_token) {
    logger.error("Facebook token exchange failed.", {
      status: response.status,
      message: token.error?.message,
      type: token.error?.type,
      code: token.error?.code,
    });
  }

  return token;
}

async function fetchFacebookPagesForToken(accessToken: string) {
  const url = new URL(`https://graph.facebook.com/${graphApiVersion}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token,tasks");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url);
  const body = (await response.json()) as FacebookPagesResponse;

  if (body.error) {
    throw new Error(body.error.message ?? "Facebook could not list Pages.");
  }

  return (body.data ?? [])
    .filter((page) => page.id && page.name && page.access_token)
    .map((page) => ({
      pageId: page.id ?? "",
      pageName: page.name ?? "Facebook Page",
      accessToken: page.access_token ?? "",
    }));
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
