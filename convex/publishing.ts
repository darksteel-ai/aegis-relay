/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";

const publishStatus = v.union(
  v.literal("DRAFT"),
  v.literal("SCHEDULED"),
  v.literal("PROCESSING"),
  v.literal("PUBLISHED"),
  v.literal("FAILED"),
  v.literal("RETRYING"),
  v.literal("BLOCKED"),
  v.literal("APPROVAL_PENDING"),
);

export const duePosts = query({
  args: { now: v.number(), batchSize: v.number() },
  handler: async (ctx, args) => {
    const scheduledPosts = await duePostsForStatus(ctx, "SCHEDULED", args.now, args.batchSize);
    const approvalPendingPosts = await duePostsForStatus(
      ctx,
      "APPROVAL_PENDING",
      args.now,
      args.batchSize,
    );
    const posts = [...scheduledPosts, ...approvalPendingPosts]
      .sort((left, right) => {
        if (left.scheduledAt !== right.scheduledAt) {
          return left.scheduledAt - right.scheduledAt;
        }
        return left.updatedAt - right.updatedAt;
      })
      .slice(0, args.batchSize);
    return posts.map((post) => ({ id: post._id }));
  },
});

async function duePostsForStatus(
  ctx: any,
  status: "SCHEDULED" | "APPROVAL_PENDING",
  now: number,
  batchSize: number,
) {
  return ctx.db
    .query("platformPosts")
    .withIndex("by_status_scheduled", (q: any) =>
      q.eq("status", status).lte("scheduledAt", now),
    )
    .order("asc")
    .take(batchSize);
}

export const loadForPublish = query({
  args: { platformPostId: v.id("platformPosts") },
  handler: async (ctx, args) => {
    const platformPost = await ctx.db.get(args.platformPostId);
    if (!platformPost) {
      return null;
    }
    const scheduledPost = await ctx.db.get(platformPost.scheduledPostId);
    if (!scheduledPost) {
      return null;
    }
    const video = await ctx.db.get(scheduledPost.videoId);
    const accounts = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_workspace_platform", (q: any) =>
        q.eq("workspaceId", platformPost.workspaceId).eq("platform", platformPost.platform),
      )
      .collect();
    return {
      id: platformPost._id,
      platform: platformPost.platform,
      connectedAccountId: platformPost.connectedAccountId ?? null,
      title: platformPost.title ?? null,
      caption: platformPost.caption,
      privacy: platformPost.privacy,
      allowComments: platformPost.allowComments ?? null,
      allowDuet: platformPost.allowDuet ?? null,
      allowStitch: platformPost.allowStitch ?? null,
      brandContent: platformPost.brandContent ?? null,
      brandOrganic: platformPost.brandOrganic ?? null,
      status: platformPost.status,
      scheduledPost: {
        video: video && {
          storageKey: video.storageKey,
          mimeType: video.mimeType,
          sizeBytes: video.sizeBytes,
          durationSeconds: video.durationSec ?? null,
        },
        workspace: {
          connectedAccounts: accounts.map((account) => ({
            id: account._id,
            platform: account.platform,
            externalId: account.externalId,
            accessToken: account.accessToken,
            refreshToken: account.refreshToken ?? null,
            expiresAt: account.expiresAt ?? null,
          })),
        },
      },
    };
  },
});

export const claim = mutation({
  args: { platformPostId: v.id("platformPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.platformPostId);
    if (!post || (post.status !== "SCHEDULED" && post.status !== "APPROVAL_PENDING")) {
      return { count: 0 };
    }
    await ctx.db.patch(args.platformPostId, {
      status: "PROCESSING",
      lastError: undefined,
      updatedAt: Date.now(),
    });
    return { count: 1 };
  },
});

export const mark = mutation({
  args: {
    platformPostId: v.id("platformPosts"),
    status: publishStatus,
    message: v.string(),
    platformPostIdExternal: v.optional(v.string()),
    platformPostUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.platformPostId, {
      status: args.status,
      platformPostId: args.platformPostIdExternal,
      platformPostUrl: args.platformPostUrl,
      lastError: args.status === "PUBLISHED" ? undefined : args.message,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("publishAttempts", {
      platformPostId: args.platformPostId,
      status: args.status,
      message: args.message,
      createdAt: Date.now(),
    });
  },
});
