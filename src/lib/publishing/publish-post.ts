import { Platform, PublishStatus } from "@prisma/client";

import { db as defaultDb } from "@/lib/db";
import { instagramAdapter } from "@/lib/platforms/instagram";
import { tiktokAdapter } from "@/lib/platforms/tiktok";
import { youtubeAdapter } from "@/lib/platforms/youtube";
import {
  PlatformApprovalPendingError,
  type PlatformAdapter,
} from "@/lib/platforms/types";

type LoadedPlatformPost = {
  id: string;
  platform: Platform;
  title?: string | null;
  caption: string;
  privacy?: string | null;
  status: PublishStatus;
  scheduledPost: {
    video: {
      storageKey: string;
      mimeType: string;
    };
    workspace: {
      connectedAccounts: Array<{
        id: string;
        platform: Platform;
        accessToken: string;
        refreshToken?: string | null;
        expiresAt?: Date | null;
      }>;
    };
  };
};

export type PublishPlatformPostDb = {
  platformPost: {
    findFirst(args: unknown): Promise<LoadedPlatformPost | null>;
    update(args: unknown): Promise<unknown>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  publishAttempt: {
    create(args: unknown): Promise<unknown>;
  };
};

type PublishPlatformPostOptions = {
  db?: PublishPlatformPostDb;
  adapters?: Partial<Record<Platform, PlatformAdapter>>;
};

const defaultAdapters: Record<Platform, PlatformAdapter> = {
  [Platform.YOUTUBE]: youtubeAdapter,
  [Platform.TIKTOK]: tiktokAdapter,
  [Platform.INSTAGRAM]: instagramAdapter,
};

export async function publishPlatformPost(
  platformPostId: string,
  {
    db = defaultDb as unknown as PublishPlatformPostDb,
    adapters = defaultAdapters,
  }: PublishPlatformPostOptions = {},
) {
  const platformPost = await db.platformPost.findFirst({
    where: { id: platformPostId },
    include: {
      scheduledPost: {
        include: {
          video: true,
          workspace: {
            include: {
              connectedAccounts: true,
            },
          },
        },
      },
    },
  });

  if (!platformPost) {
    throw new Error("Platform post not found.");
  }

  if (platformPost.status !== PublishStatus.SCHEDULED) {
    return { status: platformPost.status };
  }

  const connectedAccount =
    platformPost.scheduledPost.workspace.connectedAccounts.find(
      (account) => account.platform === platformPost.platform,
    ) ?? null;

  if (!connectedAccount) {
    const message = `Connect a ${formatPlatformName(platformPost.platform)} account before publishing.`;
    await markPublishAttempt(db, platformPost.id, PublishStatus.BLOCKED, message);
    return { status: PublishStatus.BLOCKED };
  }

  const claim = await db.platformPost.updateMany({
    where: { id: platformPost.id, status: PublishStatus.SCHEDULED },
    data: { status: PublishStatus.PROCESSING, lastError: null },
  });

  if (claim.count === 0) {
    return { status: PublishStatus.PROCESSING };
  }

  const adapter = adapters[platformPost.platform];

  if (!adapter) {
    const message = `${formatPlatformName(platformPost.platform)} publishing is not configured.`;
    await markPublishAttempt(db, platformPost.id, PublishStatus.FAILED, message);
    return { status: PublishStatus.FAILED };
  }

  try {
    const result = await adapter.publish({
      connectedAccount: {
        id: connectedAccount.id,
        accessToken: connectedAccount.accessToken,
        refreshToken: connectedAccount.refreshToken,
        expiresAt: connectedAccount.expiresAt,
      },
      platformPost: {
        title: platformPost.title,
        caption: platformPost.caption,
        privacy: platformPost.privacy,
      },
      video: {
        storageKey: platformPost.scheduledPost.video.storageKey,
        mimeType: platformPost.scheduledPost.video.mimeType,
      },
    });

    await db.platformPost.update({
      where: { id: platformPost.id },
      data: {
        status: PublishStatus.PUBLISHED,
        platformPostId: result.platformPostId,
        platformPostUrl: result.url,
        lastError: null,
      },
    });
    await db.publishAttempt.create({
      data: {
        platformPostId: platformPost.id,
        status: PublishStatus.PUBLISHED,
        message: "Published successfully.",
      },
    });

    return { status: PublishStatus.PUBLISHED };
  } catch (error) {
    const message = toPublishErrorMessage(error, platformPost.platform);
    await markPublishAttempt(db, platformPost.id, PublishStatus.FAILED, message);
    return { status: PublishStatus.FAILED };
  }
}

export function toPublishErrorMessage(error: unknown, platform: Platform) {
  if (error instanceof PlatformApprovalPendingError) {
    return error.message;
  }

  return `${formatPlatformName(platform)} publishing failed. Please try again or reconnect the account.`;
}

async function markPublishAttempt(
  db: PublishPlatformPostDb,
  platformPostId: string,
  status: PublishStatus,
  message: string,
) {
  await db.platformPost.update({
    where: { id: platformPostId },
    data: { status, lastError: message },
  });
  await db.publishAttempt.create({
    data: {
      platformPostId,
      status,
      message,
    },
  });
}

function formatPlatformName(platform: Platform) {
  const labels: Record<Platform, string> = {
    [Platform.YOUTUBE]: "YouTube",
    [Platform.TIKTOK]: "TikTok",
    [Platform.INSTAGRAM]: "Instagram",
  };

  return labels[platform];
}
