import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { google } from "googleapis";
import { ZodError } from "zod";
import type { Id } from "../../../convex/_generated/dataModel";

import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { Platform, PublishStatus } from "@/lib/domain";
import { getGoogleEnv, getPlatformTokenEnv } from "@/lib/env";
import { encryptConnectedAccountToken } from "@/lib/platforms/token-crypto";

export {
  decryptConnectedAccountToken,
  encryptConnectedAccountToken,
} from "@/lib/platforms/token-crypto";

type EnvSource = Record<string, string | undefined>;

type YouTubeOAuthStartUrlResult =
  | {
      success: true;
      url: string;
    }
  | {
      success: false;
      reason: "config-error";
    };

const youtubeUploadScope = "https://www.googleapis.com/auth/youtube.upload";
export const youtubeOAuthStateCookieName = "youtube_oauth_state";
const youtubeOAuthStateTtlMs = 10 * 60 * 1000;

export function buildYouTubeOAuthStartUrl(
  source: EnvSource = process.env,
  options: { state?: string } = {},
): YouTubeOAuthStartUrlResult {
  let googleEnv;

  try {
    googleEnv = getGoogleEnv(source);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        reason: "config-error",
      };
    }

    throw error;
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", googleEnv.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", googleEnv.GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", youtubeUploadScope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  if (options.state) {
    url.searchParams.set("state", options.state);
  }

  return {
    success: true,
    url: url.toString(),
  };
}

export function createYouTubeOAuthNonce() {
  return randomBytes(24).toString("base64url");
}

export function createYouTubeOAuthState({
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
    expiresAt: now.getTime() + youtubeOAuthStateTtlMs,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signState(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyYouTubeOAuthState({
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

type GoogleTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  scope?: string | null;
};

type CompleteYouTubeOAuthCallbackInput = {
  code: string;
  workspaceId: string;
  env?: EnvSource;
  db?: {
    connectedAccount: {
      upsert(args: {
        where: {
          workspaceId_platform_externalId: {
            workspaceId: string;
            platform: Platform;
            externalId: string;
          };
        };
        create: ConnectedAccountWrite;
        update: Omit<ConnectedAccountWrite, "workspaceId" | "platform" | "externalId">;
        select: { id: true };
      }): Promise<{ id: string }>;
    };
  };
  exchangeCodeForTokens?: (code: string) => Promise<{ tokens: GoogleTokens }>;
  fetchMineChannel?: (tokens: GoogleTokens) => Promise<{ id: string; title: string } | null>;
};

type ConnectedAccountWrite = {
  workspaceId: string;
  platform: Platform;
  accountName: string;
  externalId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: Date | null;
  scopes: string;
  status: PublishStatus;
};

type CompleteYouTubeOAuthCallbackResult =
  | {
      success: true;
      accountId: string;
    }
  | {
      success: false;
      reason: "config-error" | "missing-token" | "missing-channel";
      message: string;
    };

export async function completeYouTubeOAuthCallback({
  code,
  workspaceId,
  env = process.env,
  db,
  exchangeCodeForTokens = exchangeYouTubeCodeForTokens,
  fetchMineChannel = fetchYouTubeMineChannel,
}: CompleteYouTubeOAuthCallbackInput): Promise<CompleteYouTubeOAuthCallbackResult> {
  try {
    getGoogleEnv(env);
    getPlatformTokenEnv(env);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        reason: "config-error",
        message: "YouTube OAuth token storage is not configured.",
      };
    }

    throw error;
  }

  const { tokens } = await exchangeCodeForTokens(code);

  if (!tokens.access_token) {
    return {
      success: false,
      reason: "missing-token",
      message: "Google did not return a YouTube access token.",
    };
  }

  const channel = await fetchMineChannel(tokens);

  if (!channel?.id) {
    return {
      success: false,
      reason: "missing-channel",
      message: "Google did not return a YouTube channel for this user.",
    };
  }

  const accountWrite = {
    workspaceId,
    platform: Platform.YOUTUBE,
    accountName: channel.title,
    externalId: channel.id,
    accessToken: encryptConnectedAccountToken(tokens.access_token, env),
    refreshToken: tokens.refresh_token
      ? encryptConnectedAccountToken(tokens.refresh_token, env)
      : undefined,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scopes: tokens.scope ?? youtubeUploadScope,
    status: PublishStatus.SCHEDULED,
  };
  const account = db
    ? await db.connectedAccount.upsert({
        where: {
          workspaceId_platform_externalId: {
            workspaceId,
            platform: Platform.YOUTUBE,
            externalId: channel.id,
          },
        },
        create: accountWrite,
        update: {
          accountName: accountWrite.accountName,
          accessToken: accountWrite.accessToken,
          expiresAt: accountWrite.expiresAt,
          scopes: accountWrite.scopes,
          status: accountWrite.status,
          ...(accountWrite.refreshToken ? { refreshToken: accountWrite.refreshToken } : {}),
        },
        select: { id: true },
      })
    : await getConvexClient().mutation(convexApi.connections.upsert, {
        ...accountWrite,
        workspaceId: workspaceId as Id<"workspaces">,
        expiresAt: accountWrite.expiresAt?.getTime(),
      });

  return {
    success: true,
    accountId: account.id,
  };
}

async function exchangeYouTubeCodeForTokens(code: string) {
  const googleEnv = getGoogleEnv();
  const oauthClient = new google.auth.OAuth2(
    googleEnv.GOOGLE_CLIENT_ID,
    googleEnv.GOOGLE_CLIENT_SECRET,
    googleEnv.GOOGLE_REDIRECT_URI,
  );

  return oauthClient.getToken(code);
}

async function fetchYouTubeMineChannel(tokens: GoogleTokens) {
  const googleEnv = getGoogleEnv();
  const oauthClient = new google.auth.OAuth2(
    googleEnv.GOOGLE_CLIENT_ID,
    googleEnv.GOOGLE_CLIENT_SECRET,
    googleEnv.GOOGLE_REDIRECT_URI,
  );
  oauthClient.setCredentials({
    access_token: tokens.access_token ?? undefined,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
    scope: tokens.scope ?? undefined,
  });
  const youtube = google.youtube({ version: "v3", auth: oauthClient });
  const response = await youtube.channels.list({
    part: ["snippet"],
    mine: true,
    maxResults: 1,
  });
  const channel = response.data.items?.[0];

  if (!channel?.id) {
    return null;
  }

  return {
    id: channel.id,
    title: channel.snippet?.title ?? "YouTube channel",
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
