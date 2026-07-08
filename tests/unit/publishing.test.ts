import { Platform, PublishStatus } from "@/lib/domain";
import { describe, expect, test, vi } from "vitest";

import {
  publishPlatformPost,
  toPublishErrorMessage,
  type PublishPlatformPostDb,
} from "@/lib/publishing/publish-post";
import {
  publishDuePosts,
  resetRetryablePlatformPosts,
  type PublishingSchedulerDb,
} from "@/lib/publishing/scheduler";
import {
  PlatformApprovalPendingError,
  PlatformPublishProviderError,
  type PlatformAdapter,
} from "@/lib/platforms/types";

const platformPost = {
  id: "platform_post_1",
  scheduledPostId: "scheduled_post_1",
  platform: Platform.YOUTUBE,
  title: "Launch demo",
  caption: "Demo caption",
  privacy: "public",
  status: PublishStatus.SCHEDULED,
  platformPostId: null,
  connectedAccountId: null as string | null,
  lastError: null,
  scheduledPost: {
    id: "scheduled_post_1",
    workspaceId: "workspace_1",
    scheduledAt: new Date("2026-05-12T12:00:00.000Z"),
    video: {
      storageKey: "uploads/workspace_1/demo.mp4",
      mimeType: "video/mp4",
      sizeBytes: 1024,
    },
    workspace: {
      id: "workspace_1",
      connectedAccounts: [
        {
          id: "connected_account_1",
          platform: Platform.YOUTUBE,
          externalId: "external_channel_1",
          accessToken: "encrypted-access",
          refreshToken: "encrypted-refresh",
          expiresAt: new Date("2026-06-01T00:00:00.000Z"),
        },
      ],
    },
  },
};

function createPublishDb(row = platformPost): PublishPlatformPostDb {
  return {
    platformPost: {
      findFirst: vi.fn(async () => row),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    publishAttempt: {
      create: vi.fn(async () => ({})),
    },
  };
}

describe("publishPlatformPost", () => {
  test("marks a platform post blocked and records an attempt when no connected account exists", async () => {
    const db = createPublishDb({
      ...platformPost,
      scheduledPost: {
        ...platformPost.scheduledPost,
        workspace: {
          ...platformPost.scheduledPost.workspace,
          connectedAccounts: [],
        },
      },
    });

    const result = await publishPlatformPost("platform_post_1", { db });

    expect(result.status).toBe(PublishStatus.BLOCKED);
    expect(db.platformPost.update).toHaveBeenCalledWith({
      where: { id: "platform_post_1" },
      data: {
        status: PublishStatus.BLOCKED,
        lastError: "Connect a YouTube account before publishing.",
      },
    });
    expect(db.publishAttempt.create).toHaveBeenCalledWith({
      data: {
        platformPostId: "platform_post_1",
        status: PublishStatus.BLOCKED,
        message: "Connect a YouTube account before publishing.",
      },
    });
  });

  test("claims, publishes, clears errors, and records a success attempt", async () => {
    const db = createPublishDb();
    const adapter: PlatformAdapter = {
      publish: vi.fn(async () => ({
        platformPostId: "youtube_123",
        url: "https://www.youtube.com/watch?v=youtube_123",
      })),
    };

    const result = await publishPlatformPost("platform_post_1", {
      db,
      adapters: { [Platform.YOUTUBE]: adapter },
    });

    expect(result.status).toBe(PublishStatus.PUBLISHED);
    expect(db.platformPost.updateMany).toHaveBeenCalledWith({
      where: {
        id: "platform_post_1",
        status: { in: [PublishStatus.SCHEDULED, PublishStatus.APPROVAL_PENDING] },
      },
      data: { status: PublishStatus.PROCESSING, lastError: null },
    });
    expect(adapter.publish).toHaveBeenCalledWith({
      connectedAccount: {
        id: "connected_account_1",
        externalId: "external_channel_1",
        accessToken: "encrypted-access",
        refreshToken: "encrypted-refresh",
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
      },
      platformPost: {
        title: "Launch demo",
        caption: "Demo caption",
        privacy: "public",
      },
      video: {
        storageKey: "uploads/workspace_1/demo.mp4",
        mimeType: "video/mp4",
        sizeBytes: 1024,
      },
    });
    expect(db.platformPost.update).toHaveBeenCalledWith({
      where: { id: "platform_post_1" },
      data: {
        status: PublishStatus.PUBLISHED,
        platformPostId: "youtube_123",
        platformPostUrl: "https://www.youtube.com/watch?v=youtube_123",
        lastError: null,
      },
    });
    expect(db.publishAttempt.create).toHaveBeenCalledWith({
      data: {
        platformPostId: "platform_post_1",
        status: PublishStatus.PUBLISHED,
        message: "Published successfully.",
      },
    });
  });

  test("does not mark a post retryable when adapter succeeds but success persistence fails", async () => {
    const db = createPublishDb();
    const update = vi.fn(async () => {
      throw new Error("database write failed after provider success");
    });
    db.platformPost.update = update;
    const adapter: PlatformAdapter = {
      publish: vi.fn(async () => ({
        platformPostId: "youtube_123",
        url: "https://www.youtube.com/watch?v=youtube_123",
      })),
    };

    const result = await publishPlatformPost("platform_post_1", {
      db,
      adapters: { [Platform.YOUTUBE]: adapter },
    });

    expect(result.status).toBe(PublishStatus.BLOCKED);
    expect(update).toHaveBeenCalledTimes(1);
    expect(db.platformPost.updateMany).toHaveBeenLastCalledWith({
      where: { id: "platform_post_1" },
      data: {
        status: PublishStatus.BLOCKED,
        platformPostId: "youtube_123",
        platformPostUrl: "https://www.youtube.com/watch?v=youtube_123",
        lastError:
          "Published on YouTube, but local confirmation failed. Manual reconciliation required before retrying.",
      },
    });
    expect(db.publishAttempt.create).toHaveBeenCalledWith({
      data: {
        platformPostId: "platform_post_1",
        status: PublishStatus.BLOCKED,
        message:
          "Published on YouTube, but local confirmation failed. Manual reconciliation required before retrying.",
      },
    });
    expect(db.platformPost.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PublishStatus.FAILED }),
      }),
    );
  });

  test("publishes through the selected connected account when one is assigned", async () => {
    const db = createPublishDb({
      ...platformPost,
      connectedAccountId: "connected_account_2",
      scheduledPost: {
        ...platformPost.scheduledPost,
        workspace: {
          ...platformPost.scheduledPost.workspace,
          connectedAccounts: [
            ...platformPost.scheduledPost.workspace.connectedAccounts,
            {
              id: "connected_account_2",
              platform: Platform.YOUTUBE,
              externalId: "external_channel_2",
              accessToken: "selected-access",
              refreshToken: "selected-refresh",
              expiresAt: new Date("2026-07-01T00:00:00.000Z"),
            },
          ],
        },
      },
    });
    const adapter: PlatformAdapter = {
      publish: vi.fn(async () => ({
        platformPostId: "youtube_456",
      })),
    };

    await publishPlatformPost("platform_post_1", {
      db,
      adapters: { [Platform.YOUTUBE]: adapter },
    });

    expect(adapter.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        connectedAccount: expect.objectContaining({
          id: "connected_account_2",
          accessToken: "selected-access",
        }),
      }),
    );
  });

  test("marks adapter failures with a safe message and records a failed attempt", async () => {
    const db = createPublishDb();
    const adapter: PlatformAdapter = {
      publish: vi.fn(async () => {
        throw new Error("provider token secret_123 failed with raw response body");
      }),
    };

    const result = await publishPlatformPost("platform_post_1", {
      db,
      adapters: { [Platform.YOUTUBE]: adapter },
    });

    expect(result.status).toBe(PublishStatus.FAILED);
    expect(db.platformPost.update).toHaveBeenCalledWith({
      where: { id: "platform_post_1" },
      data: {
        status: PublishStatus.FAILED,
        lastError: "YouTube publishing failed. Please try again or reconnect the account.",
      },
    });
    expect(db.publishAttempt.create).toHaveBeenCalledWith({
      data: {
        platformPostId: "platform_post_1",
        status: PublishStatus.FAILED,
        message: "YouTube publishing failed. Please try again or reconnect the account.",
      },
    });
  });

  test("keeps approval pending adapter messages human-readable", () => {
    const error = new PlatformApprovalPendingError(
      Platform.TIKTOK,
      "TikTok publishing is pending platform approval.",
    );
    expect(toPublishErrorMessage(error, Platform.TIKTOK)).toBe(
      "TikTok publishing is pending platform approval.",
    );
  });

  test("keeps provider rejection messages actionable without exposing tokens", () => {
    const error = new PlatformPublishProviderError(
      Platform.TIKTOK,
      "Video duration exceeds creator limit. access_token=secret-token",
    );

    expect(toPublishErrorMessage(error, Platform.TIKTOK)).toBe(
      "TikTok rejected the publish request: Video duration exceeds creator limit. access_token=[redacted]",
    );
  });

  test("explains expired token failures in plain language", () => {
    expect(toPublishErrorMessage(new Error("invalid_grant: token expired"), Platform.YOUTUBE)).toBe(
      "YouTube access expired. Reconnect the account, then retry this post.",
    );
  });

  test("explains missing permission failures in plain language", () => {
    expect(toPublishErrorMessage(new Error("403 insufficient permission scope"), Platform.INSTAGRAM)).toBe(
      "Instagram is missing a required permission. Reconnect the account and approve every requested permission.",
    );
  });
});

describe("publishDuePosts", () => {
  test("selects due scheduled platform posts within the batch limit", async () => {
    const publishOne = vi.fn(async () => ({ status: PublishStatus.PUBLISHED }));
    const db: PublishingSchedulerDb = {
      platformPost: {
        findMany: vi.fn(async () => [{ id: "platform_post_1" }, { id: "platform_post_2" }]),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
    };
    const now = new Date("2026-05-12T15:00:00.000Z");

    const result = await publishDuePosts({ db, now, batchSize: 2, publishOne });

    expect(result).toEqual({ processed: 2 });
    expect(db.platformPost.findMany).toHaveBeenCalledWith({
      where: {
        status: PublishStatus.SCHEDULED,
        scheduledAt: { lte: now },
      },
      select: { id: true },
      orderBy: [{ scheduledAt: "asc" }, { updatedAt: "asc" }],
      take: 2,
    });
    expect(publishOne).toHaveBeenCalledTimes(2);
    expect(publishOne).toHaveBeenNthCalledWith(1, "platform_post_1");
    expect(publishOne).toHaveBeenNthCalledWith(2, "platform_post_2");
  });
});

describe("resetRetryablePlatformPosts", () => {
  test("uses one scoped update to reset retryable posts owned by the user workspace", async () => {
    const db: PublishingSchedulerDb = {
      platformPost: {
        findMany: vi.fn(async () => []),
        updateMany: vi.fn(async () => ({ count: 2 })),
      },
    };

    const result = await resetRetryablePlatformPosts({
      db,
      postId: "scheduled_post_1",
      userId: "user_1",
    });

    expect(result).toEqual({ resetCount: 2 });
    expect(db.platformPost.updateMany).toHaveBeenCalledWith({
      where: {
        scheduledPostId: "scheduled_post_1",
        scheduledPost: {
          workspace: {
            members: {
              some: { userId: "user_1" },
            },
          },
        },
        status: {
          in: [PublishStatus.FAILED, PublishStatus.BLOCKED, PublishStatus.APPROVAL_PENDING],
        },
        platformPostId: null,
      },
      data: {
        status: PublishStatus.SCHEDULED,
        lastError: null,
      },
    });
  });

  test("does not reset posts when the scheduled post is outside the user workspace", async () => {
    const db: PublishingSchedulerDb = {
      platformPost: {
        findMany: vi.fn(async () => []),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
    };

    const result = await resetRetryablePlatformPosts({
      db,
      postId: "scheduled_post_1",
      userId: "user_1",
    });

    expect(result).toEqual({ resetCount: 0 });
    expect(db.platformPost.updateMany).toHaveBeenCalled();
  });
});
