import { Readable } from "node:stream";

import { getLinkedInEnv } from "@/lib/env";
import { PlatformPublishProviderError, type PlatformAdapter, type PlatformPublishInput, type PlatformPublishResult } from "@/lib/platforms/types";
import { Platform } from "@/lib/domain";
import { decryptConnectedAccountToken } from "@/lib/platforms/token-crypto";
import { getObjectReadStream } from "@/lib/storage";

type EnvSource = Record<string, string | undefined>;

type LinkedInAdapterDeps = {
  env?: EnvSource;
  fetchFn?: typeof fetch;
  getVideoReadStream?: (storageKey: string) => Promise<NodeJS.ReadableStream>;
};

type LinkedInUploadInstruction = {
  uploadUrl?: string;
  firstByte?: number;
  lastByte?: number;
};

type LinkedInInitializeUploadResponse = {
  value?: {
    video?: string;
    uploadToken?: string;
    uploadInstructions?: LinkedInUploadInstruction[];
  };
  video?: string;
  uploadToken?: string;
  uploadInstructions?: LinkedInUploadInstruction[];
  message?: string;
  serviceErrorCode?: number;
};

type LinkedInPostResponse = {
  id?: string;
  message?: string;
  serviceErrorCode?: number;
};

const defaultLinkedInApiVersion = "202605";

export function createLinkedInAdapter({
  env = process.env,
  fetchFn = fetch,
  getVideoReadStream = getObjectReadStream,
}: LinkedInAdapterDeps = {}): PlatformAdapter {
  return {
    async publish(input) {
      return publishLinkedInVideo(input, {
        env,
        fetchFn,
        getVideoReadStream,
      });
    },
  };
}

export const linkedInAdapter = createLinkedInAdapter();

async function publishLinkedInVideo(
  input: PlatformPublishInput,
  deps: Required<LinkedInAdapterDeps>,
): Promise<PlatformPublishResult> {
  const memberId = input.connectedAccount.externalId;

  if (!memberId) {
    throw new Error("LinkedIn member id is missing. Reconnect LinkedIn, then retry this post.");
  }

  if (!input.video.sizeBytes || input.video.sizeBytes <= 0) {
    throw new Error("LinkedIn publishing needs the uploaded video file size.");
  }

  const accessToken = decryptConnectedAccountToken(input.connectedAccount.accessToken, deps.env);
  const author = `urn:li:person:${memberId}`;
  const apiVersion = getLinkedInEnv(deps.env).LINKEDIN_API_VERSION ?? defaultLinkedInApiVersion;
  const upload = await initializeVideoUpload({
    accessToken,
    apiVersion,
    author,
    fetchFn: deps.fetchFn,
    sizeBytes: input.video.sizeBytes,
  });
  const videoUrn = upload.value?.video ?? upload.video;
  const uploadInstructions = upload.value?.uploadInstructions ?? upload.uploadInstructions ?? [];
  const uploadToken = upload.value?.uploadToken ?? upload.uploadToken;

  assertLinkedInOk(upload, "LinkedIn could not initialize the video upload.");

  if (!videoUrn || uploadInstructions.length === 0) {
    throw new Error("LinkedIn did not return video upload instructions.");
  }

  const videoBuffer = await streamToBuffer(await deps.getVideoReadStream(input.video.storageKey));
  const uploadedPartIds = await uploadVideoParts({
    fetchFn: deps.fetchFn,
    instructions: uploadInstructions,
    video: videoBuffer,
  });

  await finalizeVideoUpload({
    accessToken,
    apiVersion,
    fetchFn: deps.fetchFn,
    uploadedPartIds,
    uploadToken,
    videoUrn,
  });

  const postId = await createVideoPost({
    accessToken,
    apiVersion,
    author,
    caption: normalizeCaption(input.platformPost.caption),
    fetchFn: deps.fetchFn,
    title: input.platformPost.title ?? undefined,
    videoUrn,
  });

  return {
    platformPostId: postId,
    url: `https://www.linkedin.com/feed/update/${postId}`,
  };
}

async function initializeVideoUpload({
  accessToken,
  apiVersion,
  author,
  fetchFn,
  sizeBytes,
}: {
  accessToken: string;
  apiVersion: string;
  author: string;
  fetchFn: typeof fetch;
  sizeBytes: number;
}) {
  const response = await fetchFn(
    "https://api.linkedin.com/rest/videos?action=initializeUpload",
    {
      method: "POST",
      headers: linkedInHeaders(accessToken, apiVersion),
      body: JSON.stringify({
        initializeUploadRequest: {
          owner: author,
          fileSizeBytes: sizeBytes,
          uploadCaptions: false,
          uploadThumbnail: false,
        },
      }),
    },
  );

  return (await response.json()) as LinkedInInitializeUploadResponse;
}

async function uploadVideoParts({
  fetchFn,
  instructions,
  video,
}: {
  fetchFn: typeof fetch;
  instructions: LinkedInUploadInstruction[];
  video: Buffer;
}) {
  const uploadedPartIds: string[] = [];

  for (const instruction of instructions) {
    if (!instruction.uploadUrl) {
      throw new Error("LinkedIn upload instruction is missing an upload URL.");
    }

    const firstByte = instruction.firstByte ?? 0;
    const lastByte = instruction.lastByte ?? video.byteLength - 1;
    const part = video.subarray(firstByte, lastByte + 1);
    const response = await fetchFn(instruction.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(part.byteLength),
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(part),
    });

    if (!response.ok) {
      throw new Error(`LinkedIn video upload failed with ${response.status}.`);
    }

    const etag = response.headers.get("etag") ?? response.headers.get("ETag");

    if (etag) {
      uploadedPartIds.push(etag.replace(/^"|"$/g, ""));
    }
  }

  return uploadedPartIds;
}

async function finalizeVideoUpload({
  accessToken,
  apiVersion,
  fetchFn,
  uploadedPartIds,
  uploadToken,
  videoUrn,
}: {
  accessToken: string;
  apiVersion: string;
  fetchFn: typeof fetch;
  uploadedPartIds: string[];
  uploadToken?: string;
  videoUrn: string;
}) {
  const response = await fetchFn(
    "https://api.linkedin.com/rest/videos?action=finalizeUpload",
    {
      method: "POST",
      headers: linkedInHeaders(accessToken, apiVersion),
      body: JSON.stringify({
        finalizeUploadRequest: {
          video: videoUrn,
          ...(uploadToken ? { uploadToken } : {}),
          uploadedPartIds,
        },
      }),
    },
  );

  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as LinkedInPostResponse;
    assertLinkedInOk(result, "LinkedIn could not finalize the video upload.");
  }
}

async function createVideoPost({
  accessToken,
  apiVersion,
  author,
  caption,
  fetchFn,
  title,
  videoUrn,
}: {
  accessToken: string;
  apiVersion: string;
  author: string;
  caption: string;
  fetchFn: typeof fetch;
  title?: string;
  videoUrn: string;
}) {
  const response = await fetchFn("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: linkedInHeaders(accessToken, apiVersion),
    body: JSON.stringify({
      author,
      commentary: caption,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        media: {
          id: videoUrn,
          ...(title ? { title: title.slice(0, 255) } : {}),
        },
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  const result = (await response.json().catch(() => ({}))) as LinkedInPostResponse;

  assertLinkedInOk(result, "LinkedIn could not create the post.");

  const postId = result.id ?? response.headers.get("x-restli-id");

  if (!postId) {
    throw new Error("LinkedIn did not return a post id.");
  }

  return postId;
}

function linkedInHeaders(accessToken: string, apiVersion: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "LinkedIn-Version": apiVersion,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

function normalizeCaption(caption: string) {
  return caption.trim().slice(0, 3_000);
}

function assertLinkedInOk(
  result: { message?: string; serviceErrorCode?: number } | undefined,
  fallbackMessage: string,
) {
  if (!result?.message && !result?.serviceErrorCode) {
    return;
  }

  throw new PlatformPublishProviderError(
    Platform.LINKEDIN,
    result.message || fallbackMessage,
  );
}

async function streamToBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  for await (const chunk of Readable.from(stream)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
