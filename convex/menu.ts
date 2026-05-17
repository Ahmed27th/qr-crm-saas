import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getItems = query({
  args: { restaurantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("menu")
      .withIndex("by_restaurantId", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

export const addItem = mutation({
  args: {
    restaurantId: v.string(),
    category: v.string(),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    image: v.string(),
    available: v.boolean(),
    popular: v.optional(v.boolean()),
    calories: v.optional(v.number()),
    allergens: v.optional(v.array(v.string())),
    ingredients: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("menu", args);
  },
});

export const updateItem = mutation({
  args: {
    id: v.id("menu"),
    updates: v.object({
      category: v.optional(v.string()),
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      price: v.optional(v.number()),
      image: v.optional(v.string()),
      available: v.optional(v.boolean()),
      popular: v.optional(v.boolean()),
      calories: v.optional(v.number()),
      allergens: v.optional(v.array(v.string())),
      ingredients: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.updates);
  },
});

export const deleteItem = mutation({
  args: { id: v.id("menu") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
