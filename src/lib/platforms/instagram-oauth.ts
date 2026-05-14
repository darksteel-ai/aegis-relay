import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { ZodError } from "zod";
import type { Id } from "../../../convex/_generated/dataModel";

import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { Platform, PublishStatus } from "@/lib/domain";
import { getInstagramEnv, getPlatformTokenEnv } from "@/lib/env";
import { encryptConnectedAccountToken } from "@/lib/platforms/token-crypto";

type EnvSource = Record<string, string | undefined>;

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
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

export type InstagramAccountCandidate = {
  pageAccessToken: string;
  instagramAccountId: string;
  accountName: string;
  pageName: string;
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

export function buildInstagramOAuthStartUrl(
  source: EnvSource = process.env,
  options: { state?: string } = {},
): InstagramOAuthStartUrlResult {
  let instagramEnv;

  try {
    instagramEnv = getInstagramEnv(source);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        reason: "config-error",
      };
    }

    throw error;
  }

  if (!instagramEnv.META_APP_ID || !instagramEnv.META_APP_SECRET || !instagramEnv.INSTAGRAM_REDIRECT_URI) {
    return {
      success: false,
      reason: "config-error",
    };
  }

  const url = new URL(`https://www.facebook.com/${graphApiVersion}/dialog/oauth`);
  url.searchParams.set("client_id", instagramEnv.META_APP_ID);
  url.searchParams.set("redirect_uri", instagramEnv.INSTAGRAM_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", instagramDefaultScope);

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

export async function completeInstagramOAuthCallback({
  code,
  workspaceId,
  env = process.env,
  db,
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
  exchangeCodeForToken?: (code: string, env: EnvSource) => Promise<MetaTokenResponse>;
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

  const token = await exchangeCodeForToken(code, env);

  if (!token.access_token) {
    return {
      success: false,
      reason: "missing-token",
      message: token.error?.message ?? "Meta did not return an access token.",
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
    accessToken: encryptConnectedAccountToken(account.pageAccessToken, env),
    refreshToken: undefined,
    expiresAt: null,
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

async function exchangeInstagramCodeForToken(code: string, env: EnvSource) {
  const instagramEnv = getInstagramEnv(env);

  if (!instagramEnv.META_APP_ID || !instagramEnv.META_APP_SECRET || !instagramEnv.INSTAGRAM_REDIRECT_URI) {
    throw new Error("Instagram OAuth is not configured.");
  }

  const url = new URL(`https://graph.facebook.com/${graphApiVersion}/oauth/access_token`);
  url.searchParams.set("client_id", instagramEnv.META_APP_ID);
  url.searchParams.set("client_secret", instagramEnv.META_APP_SECRET);
  url.searchParams.set("redirect_uri", instagramEnv.INSTAGRAM_REDIRECT_URI);
  url.searchParams.set("code", code);
  const response = await fetch(url);

  return (await response.json()) as MetaTokenResponse;
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
      name?: string;
      access_token?: string;
      instagram_business_account?: {
        id?: string;
        username?: string;
        name?: string;
      };
    }>;
  };

  return (body.data ?? [])
    .map((page) => {
      const instagramAccount = page.instagram_business_account;

      if (!page.access_token || !instagramAccount?.id) {
        return null;
      }

      return {
        pageAccessToken: page.access_token,
        instagramAccountId: instagramAccount.id,
        accountName: instagramAccount.username ?? instagramAccount.name ?? "Instagram account",
        pageName: page.name ?? "Facebook Page",
      };
    })
    .filter((account): account is InstagramAccountCandidate => account !== null);
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
