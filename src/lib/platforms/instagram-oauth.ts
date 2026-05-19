import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { ZodError } from "zod";
import type { Id } from "../../../convex/_generated/dataModel";

import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { Platform, PublishStatus } from "@/lib/domain";
import { getInstagramEnv, getPlatformTokenEnv } from "@/lib/env";
import { encryptConnectedAccountToken } from "@/lib/platforms/token-crypto";

type EnvSource = Record<string, string | undefined>;
type ConsoleLike = Pick<typeof console, "error" | "info">;

type InstagramOAuthStartUrlResult =
  | {
      success: true;
      url: string;
    }
  | {
      success: false;
      reason: "config-error";
    };

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  user_id?: number;
  error_message?: string;
  error_type?: string;
  error_code?: number;
  code?: number;
  fbtrace_id?: string;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

export type InstagramAccountCandidate = {
  instagramAccountId: string;
  accountName: string;
  accessToken?: string;
};

type InstagramOAuthCredentials = {
  clientId?: string;
  clientSecret?: string;
  loginConfigId?: string;
  redirectUri?: string;
};

const graphApiVersion = "v24.0";
const instagramOAuthScopes = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
] as const;
const instagramDefaultScope = instagramOAuthScopes.join(",");
export const instagramOAuthStateCookieName = "instagram_oauth_state";
const instagramOAuthStateTtlMs = 10 * 60 * 1000;

function getInstagramOAuthCredentials(source: EnvSource): InstagramOAuthCredentials {
  const instagramEnv = getInstagramEnv(source);

  if (
    instagramEnv.INSTAGRAM_APP_ID &&
    instagramEnv.INSTAGRAM_APP_SECRET &&
    isMetaAppId(instagramEnv.INSTAGRAM_APP_ID)
  ) {
    return {
      clientId: instagramEnv.INSTAGRAM_APP_ID,
      clientSecret: instagramEnv.INSTAGRAM_APP_SECRET,
      loginConfigId: instagramEnv.INSTAGRAM_LOGIN_CONFIG_ID,
      redirectUri: instagramEnv.INSTAGRAM_REDIRECT_URI,
    };
  }

  if (
    instagramEnv.META_APP_ID &&
    instagramEnv.META_APP_SECRET &&
    isMetaAppId(instagramEnv.META_APP_ID)
  ) {
    return {
      clientId: instagramEnv.META_APP_ID,
      clientSecret: instagramEnv.META_APP_SECRET,
      loginConfigId: instagramEnv.INSTAGRAM_LOGIN_CONFIG_ID,
      redirectUri: instagramEnv.INSTAGRAM_REDIRECT_URI,
    };
  }

  return {
    clientId: undefined,
    clientSecret: undefined,
    loginConfigId: instagramEnv.INSTAGRAM_LOGIN_CONFIG_ID,
    redirectUri: instagramEnv.INSTAGRAM_REDIRECT_URI,
  };
}

function isMetaAppId(value: string) {
  return /^\d+$/.test(value);
}

export function getInstagramOAuthRedirectUri(source: EnvSource = process.env) {
  return getInstagramOAuthCredentials(source).redirectUri;
}

export function buildInstagramOAuthStartUrl(
  source: EnvSource = process.env,
  options: { state?: string } = {},
): InstagramOAuthStartUrlResult {
  let credentials;

  try {
    credentials = getInstagramOAuthCredentials(source);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        reason: "config-error",
      };
    }

    throw error;
  }

  if (!credentials.clientId || !credentials.clientSecret || !credentials.redirectUri) {
    return {
      success: false,
      reason: "config-error",
    };
  }

  const url = new URL(`https://www.facebook.com/${graphApiVersion}/dialog/oauth`);
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("redirect_uri", credentials.redirectUri);
  url.searchParams.set("response_type", "code");

  if (credentials.loginConfigId) {
    url.searchParams.set("config_id", credentials.loginConfigId);
    url.searchParams.set("override_default_response_type", "true");
  } else {
    url.searchParams.set("scope", instagramDefaultScope);
  }

  if (options.state) {
    url.searchParams.set("state", options.state);
  }

  return {
    success: true,
    url: url.toString(),
  };
}

export function createInstagramOAuthNonce() {
  return randomBytes(24).toString("base64url");
}

export function createInstagramOAuthState({
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
    expiresAt: now.getTime() + instagramOAuthStateTtlMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signState(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyInstagramOAuthState({
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
      redirectUri?: string;
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

export async function completeInstagramOAuthCallback({
  code,
  workspaceId,
  env = process.env,
  db,
  redirectUri,
  logger = console,
  exchangeCodeForToken = exchangeInstagramCodeForToken,
  fetchInstagramAccounts = fetchInstagramAccountsForToken,
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
  ) => Promise<MetaTokenResponse>;
  fetchInstagramAccounts?: (accessToken: string) => Promise<InstagramAccountCandidate[]>;
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
    getInstagramEnv(env);
    getPlatformTokenEnv(env);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        reason: "config-error",
        message: "Instagram OAuth token storage is not configured.",
      };
    }

    throw error;
  }

  const token = await exchangeCodeForToken(code, env, redirectUri, logger);

  if (!token.access_token) {
    return {
      success: false,
      reason: "missing-token",
      message: getInstagramTokenErrorMessage(token),
    };
  }

  const accounts = await fetchInstagramAccounts(token.access_token);
  const account = accounts[0];

  if (!account) {
    return {
      success: false,
      reason: "missing-account",
      message:
        "Meta did not return a professional Instagram account linked to a Facebook Page.",
    };
  }

  const accountWrite = {
    workspaceId,
    platform: Platform.INSTAGRAM,
    accountName: account.accountName,
    externalId: account.instagramAccountId,
    accessToken: encryptConnectedAccountToken(account.accessToken ?? token.access_token, env),
    refreshToken: undefined,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : null,
    scopes: instagramDefaultScope,
    status: PublishStatus.SCHEDULED,
  };

  const accountId = db
    ? await db.connectedAccount.upsert(accountWrite)
    : await getConvexClient().mutation(convexApi.connections.upsert, {
        ...accountWrite,
        workspaceId: workspaceId as Id<"workspaces">,
        expiresAt: undefined,
      });

  return {
    success: true,
    accountId,
  };
}

async function exchangeInstagramCodeForToken(
  code: string,
  env: EnvSource,
  redirectUriOverride?: string,
  logger: ConsoleLike = console,
) {
  const credentials = getInstagramOAuthCredentials(env);
  const redirectUri = redirectUriOverride ?? credentials.redirectUri;

  if (!credentials.clientId || !credentials.clientSecret || !redirectUri) {
    throw new Error("Instagram OAuth is not configured.");
  }

  logger.info("Instagram short-lived token exchange started.", {
    clientIdLength: credentials.clientId.length,
    clientIdKind: isMetaAppId(credentials.clientId) ? "numeric" : "invalid",
    redirectUriHost: safeUrlHost(redirectUri),
    redirectUriPath: safeUrlPath(redirectUri),
    redirectUriLength: redirectUri.length,
    codeLength: code.length,
  });

  const url = new URL(`https://graph.facebook.com/${graphApiVersion}/oauth/access_token`);
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("client_secret", credentials.clientSecret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);
  const response = await fetch(url);

  const token = (await response.json()) as MetaTokenResponse;

  if (!token.access_token) {
    logger.error("Instagram short-lived token exchange failed.", {
      status: response.status,
      error: redactInstagramTokenError(token),
    });
    return token;
  }

  return exchangeFacebookShortLivedToken(
    token,
    credentials.clientId,
    credentials.clientSecret,
    logger,
  );
}

async function exchangeFacebookShortLivedToken(
  token: MetaTokenResponse,
  clientId: string,
  clientSecret: string,
  logger: ConsoleLike = console,
) {
  const url = new URL(`https://graph.facebook.com/${graphApiVersion}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("fb_exchange_token", token.access_token ?? "");

  const response = await fetch(url, {
    method: "GET",
  });
  const longLivedToken = (await response.json()) as MetaTokenResponse;

  if (!longLivedToken.access_token) {
    logger.error("Instagram Facebook token extension failed.", {
      status: response.status,
      error: redactInstagramTokenError(longLivedToken),
    });
    return token;
  }

  return longLivedToken;
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

async function fetchInstagramAccountsForToken(accessToken: string) {
  const url = new URL(`https://graph.facebook.com/${graphApiVersion}/me/accounts`);
  url.searchParams.set(
    "fields",
    "id,name,access_token,instagram_business_account{id,username,name}",
  );
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url);
  const body = (await response.json()) as {
    data?: Array<{
      id?: string;
      name?: string;
      access_token?: string;
      instagram_business_account?: {
        id?: string;
        username?: string;
        name?: string;
      };
    }>;
  };

  const page = body.data?.find((item) => item.instagram_business_account?.id);
  const instagramAccount = page?.instagram_business_account;
  const instagramAccountId = instagramAccount?.id;

  if (!instagramAccountId) {
    return [];
  }

  return [
    {
      instagramAccountId,
      accountName: instagramAccount.username ?? instagramAccount.name ?? page?.name ?? "Instagram account",
      accessToken: page?.access_token ?? accessToken,
    },
  ];
}

function getInstagramTokenErrorMessage(token: MetaTokenResponse) {
  return (
    token.error?.message ??
    token.error_message ??
    "Meta did not return an access token."
  );
}

function redactInstagramTokenError(token: MetaTokenResponse) {
  return {
    message: getInstagramTokenErrorMessage(token),
    type: token.error?.type ?? token.error_type,
    code: token.error?.code ?? token.error_code ?? token.code,
    fbtraceId: token.fbtrace_id,
  };
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
