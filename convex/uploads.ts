import { v } from "convex/values";
import { mutationGeneric as mutation } from "convex/server";

export const createReservation = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    storageKey: v.string(),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("uploadReservations")
      .withIndex("by_storage_key", (q) => q.eq("storageKey", args.storageKey))
      .first();

    if (existing) {
      throw new Error("Upload reservation already exists.");
    }

    const now = Date.now();
    return ctx.db.insert("uploadReservations", {
      ...args,
      status: "ISSUED",
      createdAt: now,
      updatedAt: now,
    });
  },
});
