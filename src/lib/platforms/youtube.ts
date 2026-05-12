import { google } from "googleapis";

import { getObjectReadStream } from "@/lib/storage";
import type {
  PlatformAdapter,
  PlatformPublishInput,
  PlatformPublishResult,
} from "@/lib/platforms/types";

type OAuthClient = {
  setCredentials(credentials: {
    access_token: string;
    refresh_token?: string | null;
    expiry_date?: number;
  }): void;
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
  createOAuthClient?: () => OAuthClient;
  createYouTubeClient?: (auth: OAuthClient) => YouTubeClient;
  getVideoReadStream?: (storageKey: string) => Promise<NodeJS.ReadableStream>;
};

export function createYouTubeAdapter({
  createOAuthClient = () => new google.auth.OAuth2(),
  createYouTubeClient = (auth) =>
    google.youtube({ version: "v3", auth: auth as never }) as unknown as YouTubeClient,
  getVideoReadStream = getObjectReadStream,
}: YouTubeAdapterDeps = {}): PlatformAdapter {
  return {
    async publish(input) {
      return publishYouTubeVideo(input, {
        createOAuthClient,
        createYouTubeClient,
        getVideoReadStream,
      });
    },
  };
}

export const youtubeAdapter = createYouTubeAdapter();

async function publishYouTubeVideo(
  input: PlatformPublishInput,
  deps: Required<YouTubeAdapterDeps>,
): Promise<PlatformPublishResult> {
  const auth = deps.createOAuthClient();
  auth.setCredentials({
    access_token: input.connectedAccount.accessToken,
    refresh_token: input.connectedAccount.refreshToken,
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
