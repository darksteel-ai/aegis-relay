import { PublishStatus } from "@prisma/client";

import { db as defaultDb } from "@/lib/db";
import { publishPlatformPost } from "@/lib/publishing/publish-post";

export type PublishingSchedulerDb = {
  platformPost: {
    findMany(args: unknown): Promise<Array<{ id: string }>>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  scheduledPost: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
  };
};

type PublishDuePostsOptions = {
  db?: PublishingSchedulerDb;
  now?: Date;
  batchSize?: number;
  publishOne?: (platformPostId: string) => Promise<unknown>;
};

export async function publishDuePosts({
  db = defaultDb as unknown as PublishingSchedulerDb,
  now = new Date(),
  batchSize = 25,
  publishOne = publishPlatformPost,
}: PublishDuePostsOptions = {}) {
  const duePosts = await db.platformPost.findMany({
    where: {
      status: PublishStatus.SCHEDULED,
      scheduledPost: { scheduledAt: { lte: now } },
    },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
    take: batchSize,
  });

  for (const post of duePosts) {
    await publishOne(post.id);
  }

  return { processed: duePosts.length };
}

type ResetRetryablePlatformPostsOptions = {
  db?: PublishingSchedulerDb;
  postId: string;
  userId: string;
};

export async function resetRetryablePlatformPosts({
  db = defaultDb as unknown as PublishingSchedulerDb,
  postId,
  userId,
}: ResetRetryablePlatformPostsOptions) {
  const scheduledPost = await db.scheduledPost.findFirst({
    where: {
      id: postId,
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    select: { id: true },
  });

  if (!scheduledPost) {
    return { found: false, resetCount: 0 };
  }

  const result = await db.platformPost.updateMany({
    where: {
      scheduledPostId: postId,
      status: { in: [PublishStatus.FAILED, PublishStatus.BLOCKED] },
    },
    data: {
      status: PublishStatus.SCHEDULED,
      lastError: null,
    },
  });

  return { found: true, resetCount: result.count };
}
