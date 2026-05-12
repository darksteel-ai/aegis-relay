import { v } from "convex/values";
import { mutationGeneric as mutation } from "convex/server";

export const checkoutCompleted = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) {
      return;
    }
    const canActivate =
      !workspace.stripeSubscriptionId ||
      workspace.stripeSubscriptionId === args.stripeSubscriptionId;
    const isCanceled = workspace.stripeCanceledSubscriptionId === args.stripeSubscriptionId;
    if (!canActivate || isCanceled) {
      return;
    }
    await ctx.db.patch(args.workspaceId, {
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCanceledSubscriptionId: undefined,
      plan: "pro",
      updatedAt: Date.now(),
    });
  },
});

export const subscriptionChanged = mutation({
  args: {
    workspaceId: v.optional(v.id("workspaces")),
    stripeSubscriptionId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const workspace = args.workspaceId
      ? await ctx.db.get(args.workspaceId)
      : await ctx.db
        .query("workspaces")
        .withIndex("by_subscription", (q) =>
          q.eq("stripeSubscriptionId", args.stripeSubscriptionId),
        )
        .first();

    if (!workspace) {
      return;
    }
    const active = args.status === "active" || args.status === "trialing";
    const canceled = args.status === "canceled";
    const canTouch =
      workspace.stripeSubscriptionId === args.stripeSubscriptionId ||
      (!workspace.stripeSubscriptionId && canceled);
    if (!canTouch) {
      return;
    }
    await ctx.db.patch(workspace._id, {
      plan: active ? "pro" : "beta",
      stripeSubscriptionId: canceled ? undefined : workspace.stripeSubscriptionId,
      stripeCanceledSubscriptionId: canceled
        ? args.stripeSubscriptionId
        : active
          ? undefined
          : workspace.stripeCanceledSubscriptionId,
      updatedAt: Date.now(),
    });
  },
});
