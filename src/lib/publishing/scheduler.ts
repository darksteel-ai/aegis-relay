import { PublishStatus } from "@prisma/client";

import { db as defaultDb } from "@/lib/db";
import { publishPlatformPost } from "@/lib/publishing/publish-post";

export type PublishingSchedulerDb = {
  platformPost: {
    findMany(args: unknown): Promise<Array<{ id: string }>>;
    updateMany(args: unknown): Promise<{ count: number }>;
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
      scheduledAt: { lte: now },
    },
    select: { id: true },
    orderBy: [{ scheduledAt: "asc" }, { updatedAt: "asc" }],
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
  const result = await db.platformPost.updateMany({
    where: {
      scheduledPostId: postId,
      scheduledPost: {
        workspace: {
          members: {
            some: { userId },
          },
        },
      },
      status: { in: [PublishStatus.FAILED, PublishStatus.BLOCKED] },
      platformPostId: null,
    },
    data: {
      status: PublishStatus.SCHEDULED,
      lastError: null,
    },
  });

  return { resetCount: result.count };
}
