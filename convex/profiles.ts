import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const getById = query({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("profiles"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      coverImage: v.optional(v.string()),
      logo: v.optional(v.string()),
      aboutInfo: v.optional(v.string()),
      aboutImage: v.optional(v.string()),
      openingHours: v.optional(v.string()),
      googleReviewUrl: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.updates);
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    coverImage: v.string(),
    logo: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("profiles", {
      ...args,
    });
  },
});
