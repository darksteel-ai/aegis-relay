import { v } from "convex/values";
import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";

function defaultWorkspaceName(email?: string, name?: string) {
  if (name?.trim()) {
    return `${name.trim()}'s Workspace`;
  }
  const emailName = email?.split("@")[0]?.trim();
  return emailName ? `${emailName}'s Workspace` : "My Workspace";
}

export const ensureForUser = mutation({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", args.userId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        image: args.image,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("users", {
        authUserId: args.userId,
        email: args.email,
        name: args.name,
        image: args.image,
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingMembership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existingMembership) {
      return { workspaceId: existingMembership.workspaceId };
    }

    const workspaceId = await ctx.db.insert("workspaces", {
      name: defaultWorkspaceName(args.email, args.name),
      plan: "beta",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("workspaceMembers", {
      userId: args.userId,
      workspaceId,
      role: "owner",
      createdAt: now,
    });

    return { workspaceId };
  },
});

export const getForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!membership) {
      return null;
    }

    const workspace = await ctx.db.get(membership.workspaceId);
    if (!workspace) {
      return null;
    }

    return {
      id: workspace._id,
      name: workspace.name,
      plan: workspace.plan,
      stripeCustomerId: workspace.stripeCustomerId ?? null,
      stripeSubscriptionId: workspace.stripeSubscriptionId ?? null,
      stripeCanceledSubscriptionId: workspace.stripeCanceledSubscriptionId ?? null,
    };
  },
});
