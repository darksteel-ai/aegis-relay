/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";

const platform = v.union(v.literal("YOUTUBE"), v.literal("TIKTOK"), v.literal("INSTAGRAM"));
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

export const listForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceForUser(ctx, args.userId);
    const accounts = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_workspace_platform", (q: any) => q.eq("workspaceId", workspaceId))
      .collect();

    return accounts.map((account) => ({
      id: account._id,
      platform: account.platform,
      accountName: account.accountName,
      externalId: account.externalId,
      scopes: account.scopes,
      hasRefreshToken: Boolean(account.refreshToken),
      status: account.status,
      expiresAt: account.expiresAt ?? null,
      updatedAt: account.updatedAt,
    }));
  },
});

export const listPrivateForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const workspaceId = await requireWorkspaceForUser(ctx, args.userId);
    const accounts = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_workspace_platform", (q: any) => q.eq("workspaceId", workspaceId))
      .collect();

    return accounts.map((account) => ({
      id: account._id,
      platform: account.platform,
      accountName: account.accountName,
      externalId: account.externalId,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      expiresAt: account.expiresAt ?? null,
      scopes: account.scopes,
      status: account.status,
      updatedAt: account.updatedAt,
    }));
  },
});

export const upsert = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    platform,
    accountName: v.string(),
    externalId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scopes: v.string(),
    status: publishStatus,
    preserveRefreshToken: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("connectedAccounts")
      .withIndex("by_workspace_platform_external", (q: any) =>
        q
          .eq("workspaceId", args.workspaceId)
          .eq("platform", args.platform)
          .eq("externalId", args.externalId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accountName: args.accountName,
        accessToken: args.accessToken,
        refreshToken:
          args.refreshToken ?? (args.preserveRefreshToken ? existing.refreshToken : undefined),
        expiresAt: args.expiresAt,
        scopes: args.scopes,
        status: args.status,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("connectedAccounts", {
      workspaceId: args.workspaceId,
      platform: args.platform,
      accountName: args.accountName,
      externalId: args.externalId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresAt: args.expiresAt,
      scopes: args.scopes,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTokens = mutation({
  args: {
    id: v.id("connectedAccounts"),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      return;
    }
    const patch: {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: number;
      updatedAt: number;
    } = { updatedAt: Date.now() };
    if (args.accessToken) {
      patch.accessToken = args.accessToken;
    }
    if (args.refreshToken) {
      patch.refreshToken = args.refreshToken;
    }
    if (args.expiresAt !== undefined) {
      patch.expiresAt = args.expiresAt;
    }
    await ctx.db.patch(args.id, {
      ...patch,
    });
  },
});
