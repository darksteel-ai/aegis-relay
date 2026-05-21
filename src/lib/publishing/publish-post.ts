import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { Platform, PublishStatus } from "@/lib/domain";
import type { Id } from "../../../convex/_generated/dataModel";
import { instagramAdapter } from "@/lib/platforms/instagram";
import { tiktokAdapter } from "@/lib/platforms/tiktok";
import { youtubeAdapter } from "@/lib/platforms/youtube";
import {
  PlatformApprovalPendingError,
  type PlatformAdapter,
  type PlatformPublishResult,
} from "@/lib/platforms/types";

type LoadedPlatformPost = {
  id: string;
  platform: Platform;
  connectedAccountId?: string | null;
  title?: string | null;
  caption: string;
  privacy?: string | null;
  status: PublishStatus;
  scheduledPost: {
    video: {
      storageKey: string;
      mimeType: string;
      sizeBytes?: number | null;
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
  options: PublishPlatformPostOptions = {},
) {
  const adapters = options.adapters ?? defaultAdapters;

  if (!options.db) {
    return publishPlatformPostFromConvex(platformPostId, adapters);
  }

  const db = options.db;
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
      (account) =>
        platformPost.connectedAccountId
          ? account.id === platformPost.connectedAccountId
          : account.platform === platformPost.platform,
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

  let result: PlatformPublishResult;

  try {
    result = await adapter.publish({
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
        sizeBytes: platformPost.scheduledPost.video.sizeBytes,
      },
    });
  } catch (error) {
    const message = toPublishErrorMessage(error, platformPost.platform);
    await markPublishAttempt(db, platformPost.id, PublishStatus.FAILED, message);
    return { status: PublishStatus.FAILED };
  }

  try {
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
    const message =
      `Published on ${formatPlatformName(platformPost.platform)}, but local confirmation failed. ` +
      "Manual reconciliation required before retrying.";
    await markPostPublishedButBlocked(db, platformPost.id, {
      message,
      platformPostId: result.platformPostId,
      platformPostUrl: result.url,
    });
    return { status: PublishStatus.BLOCKED, error };
  }
}

async function publishPlatformPostFromConvex(
  platformPostId: string,
  adapters: Partial<Record<Platform, PlatformAdapter>>,
) {
  const client = getConvexClient();
  const platformPost = await client.query(convexApi.publishing.loadForPublish, {
    platformPostId: platformPostId as Id<"platformPosts">,
  });

  if (!platformPost) {
    throw new Error("Platform post not found.");
  }

  if (platformPost.status !== PublishStatus.SCHEDULED) {
    return { status: platformPost.status };
  }

  const connectedAccount =
    platformPost.scheduledPost.workspace.connectedAccounts.find(
      (account: { id: string; platform: Platform }) =>
        platformPost.connectedAccountId
          ? account.id === platformPost.connectedAccountId
          : account.platform === platformPost.platform,
    ) ?? null;

  if (!connectedAccount) {
    const message = `Connect a ${formatPlatformName(platformPost.platform)} account before publishing.`;
    await markConvexPublishAttempt(platformPost.id, PublishStatus.BLOCKED, message);
    return { status: PublishStatus.BLOCKED };
  }

  const claim = await client.mutation(convexApi.publishing.claim, {
    platformPostId: platformPostId as Id<"platformPosts">,
  });

  if (claim.count === 0) {
    return { status: PublishStatus.PROCESSING };
  }

  const adapter = adapters[platformPost.platform as Platform];

  if (!adapter) {
    const message = `${formatPlatformName(platformPost.platform)} publishing is not configured.`;
    await markConvexPublishAttempt(platformPost.id, PublishStatus.FAILED, message);
    return { status: PublishStatus.FAILED };
  }

  let result: PlatformPublishResult;

  try {
    result = await adapter.publish({
      connectedAccount: {
        id: connectedAccount.id,
        accessToken: connectedAccount.accessToken,
        refreshToken: connectedAccount.refreshToken,
        expiresAt: connectedAccount.expiresAt ? new Date(connectedAccount.expiresAt) : null,
      },
      platformPost: {
        title: platformPost.title,
        caption: platformPost.caption,
        privacy: platformPost.privacy,
      },
      video: {
        storageKey: platformPost.scheduledPost.video.storageKey,
        mimeType: platformPost.scheduledPost.video.mimeType,
        sizeBytes: platformPost.scheduledPost.video.sizeBytes,
      },
    });
  } catch (error) {
    const message = toPublishErrorMessage(error, platformPost.platform);
    await markConvexPublishAttempt(platformPost.id, PublishStatus.FAILED, message);
    return { status: PublishStatus.FAILED };
  }

  try {
    await markConvexPublishAttempt(platformPost.id, PublishStatus.PUBLISHED, "Published successfully.", {
      platformPostId: result.platformPostId,
      platformPostUrl: result.url,
    });
    return { status: PublishStatus.PUBLISHED };
  } catch (error) {
    const message =
      `Published on ${formatPlatformName(platformPost.platform)}, but local confirmation failed. ` +
      "Manual reconciliation required before retrying.";
    await markConvexPublishAttempt(platformPost.id, PublishStatus.BLOCKED, message, {
      platformPostId: result.platformPostId,
      platformPostUrl: result.url,
    });
    return { status: PublishStatus.BLOCKED, error };
  }
}

export function toPublishErrorMessage(error: unknown, platform: Platform) {
  if (error instanceof PlatformApprovalPendingError) {
    return error.message;
  }

  const rawMessage = error instanceof Error ? error.message.toLowerCase() : "";
  const platformName = formatPlatformName(platform);

  if (
    rawMessage.includes("invalid_grant") ||
    rawMessage.includes("expired") ||
    rawMessage.includes("unauthorized") ||
    rawMessage.includes("401")
  ) {
    return `${platformName} access expired. Reconnect the account, then retry this post.`;
  }

  if (
    rawMessage.includes("permission") ||
    rawMessage.includes("scope") ||
    rawMessage.includes("forbidden") ||
    rawMessage.includes("403")
  ) {
    return `${platformName} is missing a required permission. Reconnect the account and approve every requested permission.`;
  }

  if (rawMessage.includes("quota") || rawMessage.includes("rate limit")) {
    return `${platformName} temporarily limited this request. Retry after the platform limit resets.`;
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

async function markPostPublishedButBlocked(
  db: PublishPlatformPostDb,
  platformPostId: string,
  {
    message,
    platformPostId: externalPlatformPostId,
    platformPostUrl,
  }: {
    message: string;
    platformPostId: string;
    platformPostUrl?: string;
  },
) {
  await db.platformPost.updateMany({
    where: { id: platformPostId },
    data: {
      status: PublishStatus.BLOCKED,
      platformPostId: externalPlatformPostId,
      platformPostUrl,
      lastError: message,
    },
  });
  await db.publishAttempt.create({
    data: {
      platformPostId,
      status: PublishStatus.BLOCKED,
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

async function markConvexPublishAttempt(
  platformPostId: string,
  status: PublishStatus,
  message: string,
  published?: { platformPostId: string; platformPostUrl?: string },
) {
  await getConvexClient().mutation(convexApi.publishing.mark, {
    platformPostId: platformPostId as Id<"platformPosts">,
    status,
    message,
    platformPostIdExternal: published?.platformPostId,
    platformPostUrl: published?.platformPostUrl,
  });
}
