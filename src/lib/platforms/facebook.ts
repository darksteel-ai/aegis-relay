import {
  PlatformPublishProviderError,
  type PlatformAdapter,
  type PlatformPublishInput,
  type PlatformPublishResult,
} from "@/lib/platforms/types";
import { Platform } from "@/lib/domain";
import { decryptConnectedAccountToken } from "@/lib/platforms/token-crypto";
import { createSignedDownloadUrl } from "@/lib/storage";

type FacebookAdapterDeps = {
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  createVideoUrl?: (storageKey: string) => Promise<string>;
};

type FacebookVideoResponse = {
  id?: string;
  success?: boolean;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

const graphApiVersion = "v24.0";

export function createFacebookAdapter({
  env = process.env,
  fetchFn = fetch,
  createVideoUrl = (storageKey) => createSignedDownloadUrl({ key: storageKey }),
}: FacebookAdapterDeps = {}): PlatformAdapter {
  return {
    async publish(input) {
      return publishFacebookPageVideo(input, {
        env,
        fetchFn,
        createVideoUrl,
      });
    },
  };
}

export const facebookAdapter = createFacebookAdapter();

async function publishFacebookPageVideo(
  input: PlatformPublishInput,
  deps: Required<FacebookAdapterDeps>,
): Promise<PlatformPublishResult> {
  const pageId = input.connectedAccount.externalId;

  if (!pageId) {
    throw new Error("Facebook Page id is missing. Reconnect Facebook, then retry this post.");
  }

  const accessToken = decryptConnectedAccountToken(input.connectedAccount.accessToken, deps.env);
  const fileUrl = await deps.createVideoUrl(input.video.storageKey);
  const body = new URLSearchParams({
    access_token: accessToken,
    file_url: fileUrl,
    description: normalizeCaption(input.platformPost.caption),
    published: "true",
  });

  if (input.platformPost.title) {
    body.set("title", input.platformPost.title.slice(0, 255));
  }

  const response = await deps.fetchFn(
    `https://graph.facebook.com/${graphApiVersion}/${pageId}/videos`,
    {
      method: "POST",
      body,
    },
  );
  const result = (await response.json()) as FacebookVideoResponse;

  assertFacebookOk(result.error, "Facebook could not publish the Page video.");

  if (!result.id) {
    throw new Error("Facebook did not return a video id.");
  }

  return {
    platformPostId: result.id,
    url: `https://www.facebook.com/${pageId}/videos/${result.id}`,
  };
}

function normalizeCaption(caption: string) {
  return caption.trim().slice(0, 5_000);
}

function assertFacebookOk(
  error: FacebookVideoResponse["error"] | undefined,
  fallbackMessage: string,
) {
  if (!error) {
    return;
  }

  throw new PlatformPublishProviderError(
    Platform.FACEBOOK,
    error.message || fallbackMessage,
  );
}
