import { google } from "googleapis";
import type { Credentials } from "google-auth-library";

import { getGoogleEnv } from "@/lib/env";
import {
  decryptConnectedAccountToken,
  encryptConnectedAccountToken,
} from "@/lib/platforms/token-crypto";
import { getObjectReadStream } from "@/lib/storage";
import type {
  PlatformAdapter,
  PlatformPublishInput,
  PlatformPublishResult,
} from "@/lib/platforms/types";

type EnvSource = Record<string, string | undefined>;

type OAuthClientConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type RefreshedTokensInput = {
  connectedAccountId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date | null;
  scopes?: string;
};

type OAuthClient = {
  setCredentials(credentials: {
    access_token: string;
    refresh_token?: string | null;
    expiry_date?: number;
  }): void;
  on?(event: "tokens", handler: (tokens: Credentials) => void): void;
};

type YouTubeClient = {
  videos: {
    insert(args: {
      part: string[];
      requestBody: {
        snippet: {
          title: string;
          description: string;
        };
        status: {
          privacyStatus: string;
        };
      };
      media: {
        mimeType: string;
        body: NodeJS.ReadableStream;
      };
    }): Promise<{ data: { id?: string | null } }>;
  };
};

type YouTubeAdapterDeps = {
  env?: EnvSource;
  createOAuthClient?: (config: OAuthClientConfig) => OAuthClient;
  createYouTubeClient?: (auth: OAuthClient) => YouTubeClient;
  getVideoReadStream?: (storageKey: string) => Promise<NodeJS.ReadableStream>;
  persistRefreshedTokens?: (input: RefreshedTokensInput) => Promise<void> | void;
};

export function createYouTubeAdapter({
  env = process.env,
  createOAuthClient = ({ clientId, clientSecret, redirectUri }) =>
    new google.auth.OAuth2(clientId, clientSecret, redirectUri),
  createYouTubeClient = (auth) =>
    google.youtube({ version: "v3", auth: auth as never }) as unknown as YouTubeClient,
  getVideoReadStream = getObjectReadStream,
  persistRefreshedTokens = persistRefreshedConnectedAccountTokens,
}: YouTubeAdapterDeps = {}): PlatformAdapter {
  return {
    async publish(input) {
      return publishYouTubeVideo(input, {
        env,
        createOAuthClient,
        createYouTubeClient,
        getVideoReadStream,
        persistRefreshedTokens,
      });
    },
  };
}

export const youtubeAdapter = createYouTubeAdapter();

async function publishYouTubeVideo(
  input: PlatformPublishInput,
  deps: Required<YouTubeAdapterDeps>,
): Promise<PlatformPublishResult> {
  const googleEnv = getGoogleEnv(deps.env);
  const auth = deps.createOAuthClient({
    clientId: googleEnv.GOOGLE_CLIENT_ID,
    clientSecret: googleEnv.GOOGLE_CLIENT_SECRET,
    redirectUri: googleEnv.GOOGLE_REDIRECT_URI,
  });
  const connectedAccountId = input.connectedAccount.id;

  auth.on?.("tokens", (tokens) => {
    if (!connectedAccountId || (!tokens.access_token && !tokens.refresh_token)) {
      return;
    }

    void deps.persistRefreshedTokens({
      connectedAccountId,
      accessToken: tokens.access_token ?? undefined,
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scopes: tokens.scope,
    });
  });

  auth.setCredentials({
    access_token: decryptConnectedAccountToken(input.connectedAccount.accessToken, deps.env),
    refresh_token: input.connectedAccount.refreshToken
      ? decryptConnectedAccountToken(input.connectedAccount.refreshToken, deps.env)
      : input.connectedAccount.refreshToken,
    expiry_date: input.connectedAccount.expiresAt?.getTime(),
  });

  const youtube = deps.createYouTubeClient(auth);
  const body = await deps.getVideoReadStream(input.video.storageKey);
  const title = normalizeTitle(input.platformPost.title, input.platformPost.caption);
  const privacyStatus = normalizePrivacyStatus(input.platformPost.privacy);
  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title,
        description: input.platformPost.caption,
      },
      status: {
        privacyStatus,
      },
    },
    media: {
      mimeType: input.video.mimeType,
      body,
    },
  });

  const videoId = response.data.id;

  if (!videoId) {
    throw new Error("YouTube upload did not return a video id.");
  }

  return {
    platformPostId: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function normalizeTitle(title: string | null | undefined, caption: string) {
  const normalizedTitle = title?.trim() || caption.trim() || "Untitled video";
  return normalizedTitle.slice(0, 100);
}

function normalizePrivacyStatus(privacy: string | null | undefined) {
  if (privacy === "private" || privacy === "unlisted" || privacy === "public") {
    return privacy;
  }

  return "public";
}

async function persistRefreshedConnectedAccountTokens({
  connectedAccountId,
  accessToken,
  refreshToken,
  expiresAt,
  scopes,
}: RefreshedTokensInput) {
  const { db } = await import("@/lib/db");
  const data: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date | null;
    scopes?: string;
  } = {};

  if (accessToken) {
    data.accessToken = encryptConnectedAccountToken(accessToken);
  }

  if (refreshToken) {
    data.refreshToken = encryptConnectedAccountToken(refreshToken);
  }

  if (expiresAt !== undefined) {
    data.expiresAt = expiresAt;
  }

  if (scopes) {
    data.scopes = scopes;
  }

  if (Object.keys(data).length === 0) {
    return;
  }

  await db.connectedAccount.update({
    where: { id: connectedAccountId },
    data,
  });
}
