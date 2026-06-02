/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";

const platform = v.union(v.literal("YOUTUBE"), v.literal("TIKTOK"), v.literal("INSTAGRAM"));
const monthlyScheduledPostLimits: Record<string, number> = {
  beta: 10,
  creator: 150,
  pro: 150,
  studio: 750,
};

async function requireWorkspaceForUser(ctx: any, userId: string) {
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!membership) {
    throw new Error("Workspace not found.");
  }
  return membership.workspaceId;
}

async function platformPostsFor(ctx: any, scheduledPostId: any) {
  return ctx.db
    .query("platformPosts")
    .withIndex("by_scheduled_post", (q: any) => q.eq("scheduledPostId", scheduledPostId))
    .collect();
}

export const createScheduledPost = mutation({
  args: {
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    baseCaption: v.string(),
    youtubeTitle: v.optional(v.string()),
    hashtags: v.optional(v.string()),
    scheduledAt: v.number(),
    timezone: v.string(),
    platforms: v.array(platform),
    accountIdsByPlatform: v.optional(v.object({
      YOUTUBE: v.optional(v.array(v.id("connectedAccounts"))),
      TIKTOK: v.optional(v.array(v.id("connectedAccounts"))),
      INSTAGRAM: v.optional(v.array(v.id("connectedAccounts"))),
    })),
    tiktokSettings: v.optional(v.object({
      title: v.optional(v.string()),
      privacyLevel: v.string(),
      allowComments: v.boolean(),
      allowDuet: v.boolean(),
      allowStitch: v.boolean(),
      brandContent: v.boolean(),
      brandOrganic: v.boolean(),
      musicUsageConfirmed: v.boolean(),
    })),
    video: v.object({
      storageKey: v.string(),
      fileName: v.string(),
      mimeType: v.string(),
      sizeBytes: v.number(),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      durationSeconds: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceForUser(ctx, args.userId);
    if (workspaceId !== args.workspaceId) {
      throw new Error("Workspace not found.");
    }
    const workspace = await ctx.db.get(args.workspaceId);
    const monthlyLimit = monthlyScheduledPostLimits[workspace?.plan ?? "beta"] ?? monthlyScheduledPostLimits.beta;
    const { monthStart, monthEnd } = scheduledMonthWindow(args.scheduledAt);
    const postsThisMonth = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_workspace_scheduled", (q: any) =>
        q
          .eq("workspaceId", args.workspaceId)
          .gte("scheduledAt", monthStart)
          .lt("scheduledAt", monthEnd),
      )
      .collect();

    if (postsThisMonth.length >= monthlyLimit) {
      throw new Error(
        `Monthly post limit reached for the ${workspace?.plan ?? "beta"} plan. This plan allows ${monthlyLimit} scheduled posts per month.`,
      );
    }

    const reservation = await ctx.db
      .query("uploadReservations")
      .withIndex("by_storage_key", (q: any) => q.eq("storageKey", args.video.storageKey))
      .first();

    if (
      !reservation ||
      reservation.workspaceId !== args.workspaceId ||
      reservation.userId !== args.userId ||
      reservation.status !== "ISSUED" ||
      reservation.expiresAt <= Date.now()
    ) {
      throw new Error("Upload reservation is invalid or expired.");
    }

    const now = Date.now();
    await ctx.db.patch(reservation._id, {
      status: "CONSUMED",
      consumedAt: now,
      updatedAt: now,
    });

    const videoId = await ctx.db.insert("uploadedVideos", {
      workspaceId: args.workspaceId,
      storageKey: args.video.storageKey,
      fileName: args.video.fileName,
      mimeType: args.video.mimeType,
      sizeBytes: args.video.sizeBytes,
      width: args.video.width,
      height: args.video.height,
      durationSec:
        args.video.durationSeconds == null ? undefined : Math.round(args.video.durationSeconds),
      createdAt: now,
    });

    const postId = await ctx.db.insert("scheduledPosts", {
      workspaceId: args.workspaceId,
      videoId,
      baseCaption: args.baseCaption,
      scheduledAt: args.scheduledAt,
      timezone: args.timezone,
      createdAt: now,
      updatedAt: now,
    });
    const platformCaption = args.hashtags
      ? `${args.baseCaption.trim()}\n\n${args.hashtags}`.trim()
      : args.baseCaption;

    for (const item of args.platforms) {
      const selectedAccountIds = args.accountIdsByPlatform?.[item] ?? [];
      const targetAccountIds = selectedAccountIds.length > 0 ? selectedAccountIds : [undefined];

      for (const connectedAccountId of targetAccountIds) {
        if (connectedAccountId) {
          const account = await ctx.db.get(connectedAccountId);

          if (
            !account ||
            account.workspaceId !== args.workspaceId ||
            account.platform !== item
          ) {
            throw new Error("Selected account is not available for this workspace.");
          }
        }

        await ctx.db.insert("platformPosts", {
          scheduledPostId: postId,
          workspaceId: args.workspaceId,
          platform: item,
          connectedAccountId,
          title:
            item === "YOUTUBE"
              ? args.youtubeTitle
              : item === "TIKTOK"
                ? args.tiktokSettings?.title
                : undefined,
          caption: platformCaption,
          privacy: item === "TIKTOK" ? (args.tiktokSettings?.privacyLevel ?? "SELF_ONLY") : "public",
          allowComments: item === "TIKTOK" ? args.tiktokSettings?.allowComments : undefined,
          allowDuet: item === "TIKTOK" ? args.tiktokSettings?.allowDuet : undefined,
          allowStitch: item === "TIKTOK" ? args.tiktokSettings?.allowStitch : undefined,
          brandContent: item === "TIKTOK" ? args.tiktokSettings?.brandContent : undefined,
          brandOrganic: item === "TIKTOK" ? args.tiktokSettings?.brandOrganic : undefined,
          scheduledAt: args.scheduledAt,
          status: "SCHEDULED",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return getPostById(ctx, postId);
  },
});

export const dashboard = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    usageStart: v.optional(v.number()),
    usageEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceForUser(ctx, args.userId);
    const workspace = await ctx.db.get(workspaceId);
    const posts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_workspace_scheduled", (q: any) => q.eq("workspaceId", workspaceId))
      .order("desc")
      .take(args.limit ?? 6);
    const now = new Date();
    const usageStart =
      args.usageStart ?? Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const usageEnd =
      args.usageEnd ?? Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    const scheduledThisMonth = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_workspace_scheduled", (q: any) =>
        q
          .eq("workspaceId", workspaceId)
          .gte("scheduledAt", usageStart)
          .lt("scheduledAt", usageEnd),
      )
      .collect();
    const accounts = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_workspace_platform", (q: any) => q.eq("workspaceId", workspaceId))
      .collect();
    const firstUpload = await ctx.db
      .query("uploadedVideos")
      .withIndex("by_workspace_created", (q: any) => q.eq("workspaceId", workspaceId))
      .first();
    return {
      workspace: workspace
        ? {
            id: workspace._id,
            name: workspace.name,
            plan: workspace.plan,
            stripeCustomerId: workspace.stripeCustomerId ?? null,
            stripeSubscriptionId: workspace.stripeSubscriptionId ?? null,
        }
        : null,
      usage: {
        scheduledThisMonth: scheduledThisMonth.length,
        usageStart,
        usageEnd,
      },
      onboarding: {
        hasConnectedPlatform: accounts.length > 0,
        connectedPlatformCount: new Set(accounts.map((account) => account.platform)).size,
        hasUploadedVideo: Boolean(firstUpload),
        hasScheduledPost: scheduledThisMonth.length > 0 || posts.length > 0,
        hasBillingSetup: Boolean(
          workspace?.stripeCustomerId ||
            workspace?.stripeSubscriptionId ||
            workspace?.plan !== "beta",
        ),
      },
      connectedAccounts: accounts.map((account) => ({
        id: account._id,
        platform: account.platform,
        accountName: account.accountName,
        externalId: account.externalId,
        scopes: account.scopes,
        hasRefreshToken: Boolean(account.refreshToken),
        status: account.status,
        expiresAt: account.expiresAt ?? null,
        updatedAt: account.updatedAt,
      })),
      posts: await hydratePosts(ctx, posts),
    };
  },
});

export const calendar = query({
  args: { userId: v.string(), start: v.number(), end: v.number(), limit: v.number() },
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceForUser(ctx, args.userId);
    const posts = await ctx.db
      .query("scheduledPosts")
      .withIndex("by_workspace_scheduled", (q: any) =>
        q.eq("workspaceId", workspaceId).gte("scheduledAt", args.start).lte("scheduledAt", args.end),
      )
      .order("asc")
      .take(args.limit);
    return hydratePosts(ctx, posts);
  },
});

export const detail = query({
  args: { userId: v.string(), postId: v.id("scheduledPosts") },
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceForUser(ctx, args.userId);
    const post = await ctx.db.get(args.postId);
    if (!post || post.workspaceId !== workspaceId) {
      return null;
    }
    return getPostById(ctx, args.postId);
  },
});

export const retry = mutation({
  args: { userId: v.string(), postId: v.id("scheduledPosts") },
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceForUser(ctx, args.userId);
    const post = await ctx.db.get(args.postId);
    if (!post || post.workspaceId !== workspaceId) {
      return { resetCount: 0 };
    }
    const platformPosts = await platformPostsFor(ctx, args.postId);
    let resetCount = 0;
    for (const item of platformPosts) {
      if (
        (item.status === "FAILED" || item.status === "BLOCKED" || item.status === "APPROVAL_PENDING") &&
        !item.platformPostId
      ) {
        await ctx.db.patch(item._id, {
          status: "SCHEDULED",
          lastError: undefined,
          updatedAt: Date.now(),
        });
        resetCount += 1;
      }
    }
    return { resetCount };
  },
});

async function hydratePosts(ctx: any, posts: any[]) {
  const result = [];
  for (const post of posts) {
    result.push(await getPostById(ctx, post._id));
  }
  return result;
}

function scheduledMonthWindow(timestamp: number) {
  const date = new Date(timestamp);
  const monthStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const monthEnd = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);

  return { monthStart, monthEnd };
}

async function getPostById(ctx: any, postId: any) {
  const post = await ctx.db.get(postId);
  if (!post) {
    return null;
  }
  const video = await ctx.db.get(post.videoId);
  const platformPosts = await platformPostsFor(ctx, postId);
  return {
    id: post._id,
    workspaceId: post.workspaceId,
    baseCaption: post.baseCaption,
    scheduledAt: post.scheduledAt,
    timezone: post.timezone,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    video: video && {
      id: video._id,
      storageKey: video.storageKey,
      fileName: video.fileName,
      mimeType: video.mimeType,
      sizeBytes: video.sizeBytes,
      width: video.width ?? null,
      height: video.height ?? null,
      durationSec: video.durationSec ?? null,
    },
    platformPosts: platformPosts.map((item: any) => ({
      id: item._id,
      platform: item.platform,
      connectedAccountId: item.connectedAccountId ?? null,
      title: item.title ?? null,
      caption: item.caption,
      privacy: item.privacy,
      scheduledAt: item.scheduledAt,
      status: item.status,
      platformPostId: item.platformPostId ?? null,
      platformPostUrl: item.platformPostUrl ?? null,
      lastError: item.lastError ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  };
}
