/* eslint-disable @typescript-eslint/no-explicit-any */
import { v } from "convex/values";
import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";

export const join = mutation({
  args: {
    email: v.string(),
    niche: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const existing = await ctx.db
      .query("waitlistSignups")
      .withIndex("by_email_niche", (q: any) => q.eq("email", email).eq("niche", args.niche))
      .first();

    if (existing) {
      return { id: existing._id, alreadyJoined: true };
    }

    const id = await ctx.db.insert("waitlistSignups", {
      email,
      niche: args.niche,
      source: args.source,
      createdAt: Date.now(),
    });

    return { id, alreadyJoined: false };
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const signups = await ctx.db.query("waitlistSignups").collect();

    const countsByNiche: Record<string, number> = {};
    for (const signup of signups) {
      countsByNiche[signup.niche] = (countsByNiche[signup.niche] ?? 0) + 1;
    }

    const recent = [...signups]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 25)
      .map((signup) => ({
        id: signup._id,
        email: signup.email,
        niche: signup.niche,
        source: signup.source ?? null,
        createdAt: signup.createdAt,
      }));

    return {
      total: signups.length,
      countsByNiche,
      recent,
    };
  },
});
