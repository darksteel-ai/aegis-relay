import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { PublishStatus } from "@/lib/domain";
import { publishPlatformPost } from "@/lib/publishing/publish-post";
import type { Id } from "../../../convex/_generated/dataModel";

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
  db,
  now = new Date(),
  batchSize = 25,
  publishOne = publishPlatformPost,
}: PublishDuePostsOptions = {}) {
  const duePosts = db
    ? await db.platformPost.findMany({
        where: {
          status: PublishStatus.SCHEDULED,
          scheduledAt: { lte: now },
        },
        select: { id: true },
        orderBy: [{ scheduledAt: "asc" }, { updatedAt: "asc" }],
        take: batchSize,
      })
    : await getConvexClient().query(convexApi.publishing.duePosts, {
        now: now.getTime(),
        batchSize,
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
  db,
  postId,
  userId,
}: ResetRetryablePlatformPostsOptions) {
  if (!db) {
    return getConvexClient().mutation(convexApi.posts.retry, {
      postId: postId as Id<"scheduledPosts">,
      userId,
    });
  }

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
      status: { in: [PublishStatus.FAILED, PublishStatus.BLOCKED, PublishStatus.APPROVAL_PENDING] },
      platformPostId: null,
    },
    data: {
      status: PublishStatus.SCHEDULED,
      lastError: null,
    },
  });

  return { resetCount: result.count };
}
