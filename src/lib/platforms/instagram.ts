import {
  PlatformPublishProviderError,
  type PlatformAdapter,
  type PlatformPublishInput,
  type PlatformPublishResult,
} from "@/lib/platforms/types";
import { Platform } from "@/lib/domain";
import { decryptConnectedAccountToken } from "@/lib/platforms/token-crypto";
import { createSignedDownloadUrl } from "@/lib/storage";

type EnvSource = Record<string, string | undefined>;

type InstagramAdapterDeps = {
  env?: EnvSource;
  fetchFn?: typeof fetch;
  createVideoUrl?: (storageKey: string) => Promise<string>;
  waitMs?: (durationMs: number) => Promise<void>;
  maxStatusChecks?: number;
  statusCheckDelayMs?: number;
};

type InstagramMediaContainerResponse = {
  id?: string;
  error?: InstagramApiError;
};

type InstagramMediaStatusResponse = {
  id?: string;
  status_code?: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
  status?: string;
  error?: InstagramApiError;
};

type InstagramPublishResponse = {
  id?: string;
  error?: InstagramApiError;
};

type InstagramApiError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
};

const graphApiVersion = "v24.0";
const graphApiBaseUrl = `https://graph.instagram.com/${graphApiVersion}`;

export function createInstagramAdapter({
  env = process.env,
  fetchFn = fetch,
  createVideoUrl = (storageKey) => createSignedDownloadUrl({ key: storageKey }),
  waitMs = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs)),
  maxStatusChecks = 12,
  statusCheckDelayMs = 5_000,
}: InstagramAdapterDeps = {}): PlatformAdapter {
  return {
    async publish(input) {
      return publishInstagramReel(input, {
        env,
        fetchFn,
        createVideoUrl,
        waitMs,
        maxStatusChecks,
        statusCheckDelayMs,
      });
    },
  };
}

export const instagramAdapter = createInstagramAdapter();

async function publishInstagramReel(
  input: PlatformPublishInput,
  deps: Required<InstagramAdapterDeps>,
): Promise<PlatformPublishResult> {
  const instagramUserId = input.connectedAccount.externalId;

  if (!instagramUserId) {
    throw new Error("Instagram account id is missing. Reconnect Instagram, then retry this post.");
  }

  const accessToken = decryptConnectedAccountToken(input.connectedAccount.accessToken, deps.env);
  const videoUrl = await deps.createVideoUrl(input.video.storageKey);
  const creationId = await createReelContainer({
    accessToken,
    caption: normalizeCaption(input.platformPost.caption),
    fetchFn: deps.fetchFn,
    instagramUserId,
    videoUrl,
  });

  await waitForContainerReady({
    accessToken,
    creationId,
    fetchFn: deps.fetchFn,
    maxStatusChecks: deps.maxStatusChecks,
    statusCheckDelayMs: deps.statusCheckDelayMs,
    waitMs: deps.waitMs,
  });

  const publishedId = await publishMediaContainer({
    accessToken,
    creationId,
    fetchFn: deps.fetchFn,
    instagramUserId,
  });

  return {
    platformPostId: publishedId,
    url: `https://www.instagram.com/reel/${publishedId}/`,
  };
}

async function createReelContainer({
  accessToken,
  caption,
  fetchFn,
  instagramUserId,
  videoUrl,
}: {
  accessToken: string;
  caption: string;
  fetchFn: typeof fetch;
  instagramUserId: string;
  videoUrl: string;
}) {
  const body = new URLSearchParams({
    access_token: accessToken,
    media_type: "REELS",
    video_url: videoUrl,
    caption,
  });
  const response = await fetchFn(`${graphApiBaseUrl}/${instagramUserId}/media`, {
    method: "POST",
    body,
  });
  const result = (await response.json()) as InstagramMediaContainerResponse;

  assertInstagramOk(result.error, "Instagram could not create a Reels media container.");

  if (!result.id) {
    throw new Error("Instagram did not return a media container id.");
  }

  return result.id;
}

async function waitForContainerReady({
  accessToken,
  creationId,
  fetchFn,
  maxStatusChecks,
  statusCheckDelayMs,
  waitMs,
}: {
  accessToken: string;
  creationId: string;
  fetchFn: typeof fetch;
  maxStatusChecks: number;
  statusCheckDelayMs: number;
  waitMs: (durationMs: number) => Promise<void>;
}) {
  for (let attempt = 0; attempt < maxStatusChecks; attempt += 1) {
    const url = new URL(`${graphApiBaseUrl}/${creationId}`);
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", accessToken);
    const response = await fetchFn(url.toString());
    const result = (await response.json()) as InstagramMediaStatusResponse;

    assertInstagramOk(result.error, "Instagram could not check the media container status.");

    if (result.status_code === "FINISHED") {
      return;
    }

    if (result.status_code === "ERROR" || result.status_code === "EXPIRED") {
      throw new Error(`Instagram media container ${result.status_code.toLowerCase()}.`);
    }

    if (attempt < maxStatusChecks - 1) {
      await waitMs(statusCheckDelayMs);
    }
  }

  throw new Error("Instagram media container was not ready before the publish timeout.");
}

async function publishMediaContainer({
  accessToken,
  creationId,
  fetchFn,
  instagramUserId,
}: {
  accessToken: string;
  creationId: string;
  fetchFn: typeof fetch;
  instagramUserId: string;
}) {
  const body = new URLSearchParams({
    access_token: accessToken,
    creation_id: creationId,
  });
  const response = await fetchFn(`${graphApiBaseUrl}/${instagramUserId}/media_publish`, {
    method: "POST",
    body,
  });
  const result = (await response.json()) as InstagramPublishResponse;

  assertInstagramOk(result.error, "Instagram could not publish the Reel.");

  if (!result.id) {
    throw new Error("Instagram did not return a published media id.");
  }

  return result.id;
}

function normalizeCaption(caption: string) {
  return caption.trim().slice(0, 2_200);
}

function assertInstagramOk(error: InstagramApiError | undefined, fallbackMessage: string) {
  if (!error) {
    return;
  }

  throw new PlatformPublishProviderError(
    Platform.INSTAGRAM,
    error.message || fallbackMessage,
  );
}
