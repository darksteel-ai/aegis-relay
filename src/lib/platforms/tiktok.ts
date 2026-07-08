import { Readable } from "node:stream";

import type { Id } from "../../../convex/_generated/dataModel";

import {
  PlatformPublishProviderError,
  type PlatformAdapter,
  type PlatformPublishInput,
  type PlatformPublishResult,
} from "@/lib/platforms/types";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { Platform } from "@/lib/domain";
import { getTikTokEnv } from "@/lib/env";
import {
  decryptConnectedAccountToken,
  encryptConnectedAccountToken,
} from "@/lib/platforms/token-crypto";
import { getObjectReadStream } from "@/lib/storage";

type EnvSource = Record<string, string | undefined>;

type TikTokCreatorInfoResponse = {
  data?: {
    privacy_level_options?: string[];
    comment_disabled?: boolean;
    duet_disabled?: boolean;
    stitch_disabled?: boolean;
    max_video_post_duration_sec?: number;
  };
  error?: TikTokApiError;
};

type TikTokInitResponse = {
  data?: {
    publish_id?: string;
    upload_url?: string;
  };
  error?: TikTokApiError;
};

type TikTokApiError = {
  code?: string;
  message?: string;
  log_id?: string;
};

type TikTokRefreshTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type RefreshedTikTokTokens = {
  connectedAccountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

export type TikTokConnectedAccountTokens = {
  id?: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
};

type TikTokAdapterDeps = {
  env?: EnvSource;
  fetchFn?: typeof fetch;
  getVideoReadStream?: (storageKey: string) => Promise<NodeJS.ReadableStream>;
  persistRefreshedTokens?: (tokens: RefreshedTikTokTokens) => Promise<void> | void;
};

const tiktokApiBaseUrl = "https://open.tiktokapis.com";
// TikTok FILE_UPLOAD contract: chunks of 5-64 MB, total_chunk_count = floor(size / chunk),
// trailing bytes merge into the final chunk; videos up to 64 MB may upload as one chunk.
const maxChunkSizeBytes = 64 * 1024 * 1024;
// Refresh slightly before the reported expiry so a token that dies mid-publish is never used.
const tokenRefreshSkewMs = 5 * 60 * 1000;
const unauditedClientErrorCode = "unaudited_client_can_only_post_to_private_accounts";

export function createTikTokAdapter({
  env = process.env,
  fetchFn = fetch,
  getVideoReadStream = getObjectReadStream,
  persistRefreshedTokens = (tokens) => persistRefreshedTikTokTokens(tokens, env),
}: TikTokAdapterDeps = {}): PlatformAdapter {
  return {
    async publish(input) {
      return publishTikTokVideo(input, {
        env,
        fetchFn,
        getVideoReadStream,
        persistRefreshedTokens,
      });
    },
  };
}

export const tiktokAdapter = createTikTokAdapter();

async function publishTikTokVideo(
  input: PlatformPublishInput,
  deps: Required<TikTokAdapterDeps>,
): Promise<PlatformPublishResult> {
  const accessToken = await resolveTikTokAccessToken(input.connectedAccount, deps);
  const videoSize = input.video.sizeBytes;

  if (!videoSize || videoSize <= 0) {
    throw new Error("TikTok publishing needs the uploaded video file size.");
  }

  const creatorInfo = await fetchTikTokCreatorInfo(accessToken, deps.fetchFn);
  const privacyLevel = normalizePrivacyLevel(
    getRequestedPrivacyLevel(input.platformPost.privacy, deps.env),
    creatorInfo.data?.privacy_level_options ?? [],
  );

  let initResponse: TikTokInitResponse;
  let sentToInbox = false;

  try {
    initResponse = await initializeDirectPost({
      accessToken,
      fetchFn: deps.fetchFn,
      input,
      privacyLevel,
      videoSize,
      creatorInfo,
    });
  } catch (error) {
    if (!isUnauditedClientError(error)) {
      throw error;
    }

    // TikTok blocks direct posts from apps that have not passed the Content Posting
    // API audit unless the account is private. The inbox flow has no such block:
    // the video lands in the creator's TikTok inbox and they finish the post in-app.
    initResponse = await initializeInboxUpload({
      accessToken,
      fetchFn: deps.fetchFn,
      videoSize,
    });
    sentToInbox = true;
  }

  const publishId = initResponse.data?.publish_id;
  const uploadUrl = initResponse.data?.upload_url;

  if (!publishId || !uploadUrl) {
    throw new Error("TikTok did not return an upload URL.");
  }

  const videoBuffer = await streamToBuffer(await deps.getVideoReadStream(input.video.storageKey));
  await uploadVideoToTikTok({
    fetchFn: deps.fetchFn,
    uploadUrl,
    video: videoBuffer,
    mimeType: input.video.mimeType,
  });

  return {
    platformPostId: publishId,
    message: sentToInbox
      ? "Video sent to the TikTok inbox because this app has not passed TikTok's Content Posting audit yet. " +
        "Open the TikTok app notification to review and finish posting."
      : undefined,
  };
}

export async function resolveTikTokAccessToken(
  connectedAccount: TikTokConnectedAccountTokens,
  {
    env = process.env,
    fetchFn = fetch,
    persistRefreshedTokens,
  }: {
    env?: EnvSource;
    fetchFn?: typeof fetch;
    persistRefreshedTokens?: (tokens: RefreshedTikTokTokens) => Promise<void> | void;
  } = {},
) {
  const persist =
    persistRefreshedTokens ??
    ((tokens: RefreshedTikTokTokens) => persistRefreshedTikTokTokens(tokens, env));
  const storedAccessToken = decryptConnectedAccountToken(connectedAccount.accessToken, env);
  const expiresAt = connectedAccount.expiresAt?.getTime();

  if (!expiresAt || expiresAt > Date.now() + tokenRefreshSkewMs) {
    return storedAccessToken;
  }

  if (!connectedAccount.refreshToken) {
    throw new Error(
      "TikTok access expired and no refresh token is stored. Reconnect the TikTok account, then retry this post.",
    );
  }

  const tiktokEnv = getTikTokEnv(env);

  if (!tiktokEnv.TIKTOK_CLIENT_KEY || !tiktokEnv.TIKTOK_CLIENT_SECRET) {
    console.error(
      "TikTok access token is expired but TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET are not configured; publishing with the stored token.",
    );
    return storedAccessToken;
  }

  const refreshToken = decryptConnectedAccountToken(connectedAccount.refreshToken, env);
  const response = await fetchFn(`${tiktokApiBaseUrl}/v2/oauth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_key: tiktokEnv.TIKTOK_CLIENT_KEY,
      client_secret: tiktokEnv.TIKTOK_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const tokens = (await response.json()) as TikTokRefreshTokenResponse;

  if (!tokens.access_token) {
    throw new Error(
      tokens.error_description ??
        "TikTok access expired and could not be refreshed. Reconnect the TikTok account, then retry this post.",
    );
  }

  if (connectedAccount.id) {
    // TikTok may rotate the refresh token; losing the rotated one strands the
    // connection, so retry the persist once before giving up.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await persist({
          connectedAccountId: connectedAccount.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
        });
        break;
      } catch (error) {
        if (attempt === 1) {
          console.error(
            "TikTok refreshed tokens could not be persisted; the rotated refresh token may be lost.",
            error,
          );
        }
      }
    }
  }

  return tokens.access_token;
}

async function persistRefreshedTikTokTokens(
  { connectedAccountId, accessToken, refreshToken, expiresAt }: RefreshedTikTokTokens,
  env: EnvSource = process.env,
) {
  await getConvexClient().mutation(convexApi.connections.updateTokens, {
    id: connectedAccountId as Id<"connectedAccounts">,
    accessToken: encryptConnectedAccountToken(accessToken, env),
    refreshToken: refreshToken ? encryptConnectedAccountToken(refreshToken, env) : undefined,
    expiresAt,
  });
}

export async function fetchTikTokCreatorInfo(accessToken: string, fetchFn: typeof fetch = fetch) {
  const response = await fetchFn(`${tiktokApiBaseUrl}/v2/post/publish/creator_info/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
  const body = (await response.json()) as TikTokCreatorInfoResponse;

  assertTikTokOk(body.error, "TikTok creator info request failed.");
  return body;
}

export function planTikTokUpload(videoSize: number) {
  if (videoSize <= maxChunkSizeBytes) {
    return {
      chunkSize: videoSize,
      totalChunkCount: 1,
      chunks: [{ start: 0, end: videoSize - 1 }],
    };
  }

  const chunkSize = maxChunkSizeBytes;
  const totalChunkCount = Math.floor(videoSize / chunkSize);
  const chunks = Array.from({ length: totalChunkCount }, (_, index) => ({
    start: index * chunkSize,
    // Trailing bytes merge into the final chunk per TikTok's upload contract.
    end: index === totalChunkCount - 1 ? videoSize - 1 : (index + 1) * chunkSize - 1,
  }));

  return { chunkSize, totalChunkCount, chunks };
}

async function initializeDirectPost({
  accessToken,
  fetchFn,
  input,
  privacyLevel,
  videoSize,
  creatorInfo,
}: {
  accessToken: string;
  fetchFn: typeof fetch;
  input: PlatformPublishInput;
  privacyLevel: string;
  videoSize: number;
  creatorInfo: TikTokCreatorInfoResponse;
}) {
  const { chunkSize, totalChunkCount } = planTikTokUpload(videoSize);
  const response = await fetchFn(`${tiktokApiBaseUrl}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: normalizeCaption(input.platformPost.title || input.platformPost.caption),
        privacy_level: privacyLevel,
        disable_duet: !input.platformPost.allowDuet || Boolean(creatorInfo.data?.duet_disabled),
        disable_comment:
          !input.platformPost.allowComments || Boolean(creatorInfo.data?.comment_disabled),
        disable_stitch:
          !input.platformPost.allowStitch || Boolean(creatorInfo.data?.stitch_disabled),
        brand_content_toggle: input.platformPost.brandContent === true,
        brand_organic_toggle: input.platformPost.brandOrganic === true,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    }),
  });
  const body = (await response.json()) as TikTokInitResponse;

  assertTikTokOk(body.error, "TikTok direct post request failed.");
  return body;
}

async function initializeInboxUpload({
  accessToken,
  fetchFn,
  videoSize,
}: {
  accessToken: string;
  fetchFn: typeof fetch;
  videoSize: number;
}) {
  const { chunkSize, totalChunkCount } = planTikTokUpload(videoSize);
  const response = await fetchFn(`${tiktokApiBaseUrl}/v2/post/publish/inbox/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    }),
  });
  const body = (await response.json()) as TikTokInitResponse;

  assertTikTokOk(body.error, "TikTok inbox upload request failed.");
  return body;
}

async function uploadVideoToTikTok({
  fetchFn,
  uploadUrl,
  video,
  mimeType,
}: {
  fetchFn: typeof fetch;
  uploadUrl: string;
  video: Buffer;
  mimeType: string;
}) {
  const { chunks } = planTikTokUpload(video.byteLength);

  for (const chunk of chunks) {
    const body = new Uint8Array(video.subarray(chunk.start, chunk.end + 1));
    const response = await fetchFn(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": normalizeTikTokMimeType(mimeType),
        "Content-Length": String(body.byteLength),
        "Content-Range": `bytes ${chunk.start}-${chunk.end}/${video.byteLength}`,
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`TikTok video upload failed with ${response.status}.`);
    }
  }
}

function normalizePrivacyLevel(privacy: string | null | undefined, options: string[]) {
  const requested = mapPrivacyToTikTokLevel(privacy);

  if (requested && options.includes(requested)) {
    return requested;
  }

  if (options.includes("SELF_ONLY")) {
    return "SELF_ONLY";
  }

  return options[0] ?? "SELF_ONLY";
}

function mapPrivacyToTikTokLevel(privacy: string | null | undefined) {
  if (
    privacy === "PUBLIC_TO_EVERYONE" ||
    privacy === "MUTUAL_FOLLOW_FRIENDS" ||
    privacy === "FOLLOWER_OF_CREATOR" ||
    privacy === "SELF_ONLY"
  ) {
    return privacy;
  }

  if (privacy === "public") {
    return "PUBLIC_TO_EVERYONE";
  }

  if (privacy === "private") {
    return "SELF_ONLY";
  }

  return null;
}

function getRequestedPrivacyLevel(privacy: string | null | undefined, env: EnvSource) {
  const configuredPrivacy = env.TIKTOK_DIRECT_POST_PRIVACY_LEVEL;

  if (configuredPrivacy) {
    return configuredPrivacy;
  }

  return env.TIKTOK_ALLOW_PUBLIC_DIRECT_POSTS === "true" ? privacy : "private";
}

function normalizeCaption(caption: string) {
  return caption.trim().slice(0, 2200);
}

function normalizeTikTokMimeType(mimeType: string) {
  if (mimeType === "video/quicktime" || mimeType === "video/webm") {
    return mimeType;
  }

  return "video/mp4";
}

class TikTokApiPublishError extends PlatformPublishProviderError {
  constructor(
    readonly apiErrorCode: string | undefined,
    message: string,
  ) {
    super(Platform.TIKTOK, message);
    this.name = "TikTokApiPublishError";
  }
}

function isUnauditedClientError(error: unknown) {
  return (
    error instanceof TikTokApiPublishError && error.apiErrorCode === unauditedClientErrorCode
  );
}

function assertTikTokOk(error: TikTokApiError | undefined, fallbackMessage: string) {
  if (!error || error.code === "ok") {
    return;
  }

  const details = [error.message, error.code ? `Code: ${error.code}.` : null]
    .filter(Boolean)
    .join(" ");
  throw new TikTokApiPublishError(error.code, details || fallbackMessage);
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  for await (const chunk of Readable.from(stream)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
