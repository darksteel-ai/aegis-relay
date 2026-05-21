import { Readable } from "node:stream";

import type {
  PlatformAdapter,
  PlatformPublishInput,
  PlatformPublishResult,
} from "@/lib/platforms/types";
import { decryptConnectedAccountToken } from "@/lib/platforms/token-crypto";
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

type TikTokAdapterDeps = {
  env?: EnvSource;
  fetchFn?: typeof fetch;
  getVideoReadStream?: (storageKey: string) => Promise<NodeJS.ReadableStream>;
};

const tiktokApiBaseUrl = "https://open.tiktokapis.com";
const defaultChunkSizeBytes = 50 * 1024 * 1024;

export function createTikTokAdapter({
  env = process.env,
  fetchFn = fetch,
  getVideoReadStream = getObjectReadStream,
}: TikTokAdapterDeps = {}): PlatformAdapter {
  return {
    async publish(input) {
      return publishTikTokVideo(input, {
        env,
        fetchFn,
        getVideoReadStream,
      });
    },
  };
}

export const tiktokAdapter = createTikTokAdapter();

async function publishTikTokVideo(
  input: PlatformPublishInput,
  deps: Required<TikTokAdapterDeps>,
): Promise<PlatformPublishResult> {
  const accessToken = decryptConnectedAccountToken(input.connectedAccount.accessToken, deps.env);
  const videoSize = input.video.sizeBytes;

  if (!videoSize || videoSize <= 0) {
    throw new Error("TikTok publishing needs the uploaded video file size.");
  }

  const creatorInfo = await queryCreatorInfo(accessToken, deps.fetchFn);
  const privacyLevel = normalizePrivacyLevel(
    input.platformPost.privacy,
    creatorInfo.data?.privacy_level_options ?? [],
  );
  const initResponse = await initializeDirectPost({
    accessToken,
    fetchFn: deps.fetchFn,
    input,
    privacyLevel,
    videoSize,
    creatorInfo,
  });
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
  };
}

async function queryCreatorInfo(accessToken: string, fetchFn: typeof fetch) {
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
  const chunkSize = Math.min(videoSize, defaultChunkSizeBytes);
  const totalChunkCount = Math.ceil(videoSize / chunkSize);
  const response = await fetchFn(`${tiktokApiBaseUrl}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: normalizeCaption(input.platformPost.caption),
        privacy_level: privacyLevel,
        disable_duet: Boolean(creatorInfo.data?.duet_disabled),
        disable_comment: Boolean(creatorInfo.data?.comment_disabled),
        disable_stitch: Boolean(creatorInfo.data?.stitch_disabled),
        brand_content_toggle: false,
        brand_organic_toggle: false,
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
  const response = await fetchFn(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": normalizeTikTokMimeType(mimeType),
      "Content-Length": String(video.byteLength),
      "Content-Range": `bytes 0-${video.byteLength - 1}/${video.byteLength}`,
    },
    body: new Uint8Array(video),
  });

  if (!response.ok) {
    throw new Error(`TikTok video upload failed with ${response.status}.`);
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
  if (privacy === "public") {
    return "PUBLIC_TO_EVERYONE";
  }

  if (privacy === "private") {
    return "SELF_ONLY";
  }

  return null;
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

function assertTikTokOk(error: TikTokApiError | undefined, fallbackMessage: string) {
  if (!error || error.code === "ok") {
    return;
  }

  throw new Error(error.message || error.code || fallbackMessage);
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  for await (const chunk of Readable.from(stream)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
