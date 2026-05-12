import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

export default defineSchema({
  users: defineTable({
    authUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_auth_user", ["authUserId"]),

  workspaces: defineTable({
    name: v.string(),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripeCanceledSubscriptionId: v.optional(v.string()),
    plan: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_subscription", ["stripeSubscriptionId"]),

  workspaceMembers: defineTable({
    userId: v.string(),
    workspaceId: v.id("workspaces"),
    role: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  uploadReservations: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    storageKey: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    status: v.union(v.literal("ISSUED"), v.literal("CONSUMED")),
    consumedAt: v.optional(v.number()),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_storage_key", ["storageKey"])
    .index("by_workspace_user_status", ["workspaceId", "userId", "status", "expiresAt"]),

  uploadedVideos: defineTable({
    workspaceId: v.id("workspaces"),
    storageKey: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    durationSec: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_workspace_created", ["workspaceId", "createdAt"]),

  scheduledPosts: defineTable({
    workspaceId: v.id("workspaces"),
    videoId: v.id("uploadedVideos"),
    baseCaption: v.string(),
    scheduledAt: v.number(),
    timezone: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_workspace_scheduled", ["workspaceId", "scheduledAt"]),

  platformPosts: defineTable({
    scheduledPostId: v.id("scheduledPosts"),
    workspaceId: v.id("workspaces"),
    platform,
    title: v.optional(v.string()),
    caption: v.string(),
    privacy: v.string(),
    scheduledAt: v.number(),
    status: publishStatus,
    platformPostId: v.optional(v.string()),
    platformPostUrl: v.optional(v.string()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_scheduled_post", ["scheduledPostId"])
    .index("by_status_scheduled", ["status", "scheduledAt", "updatedAt"])
    .index("by_workspace", ["workspaceId"]),

  connectedAccounts: defineTable({
    workspaceId: v.id("workspaces"),
    platform,
    accountName: v.string(),
    externalId: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    scopes: v.string(),
    status: publishStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace_platform", ["workspaceId", "platform"])
    .index("by_workspace_platform_external", ["workspaceId", "platform", "externalId"]),

  publishAttempts: defineTable({
    platformPostId: v.id("platformPosts"),
    status: publishStatus,
    responseCode: v.optional(v.string()),
    message: v.string(),
    retryAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_platform_post_created", ["platformPostId", "createdAt"]),
});
