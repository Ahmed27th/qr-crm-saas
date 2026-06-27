import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";

const MONTHS_MS = (months: number) => months * 30 * 24 * 60 * 60 * 1000;

const runCleanup = async (ctx: any, months: number) => {
  const cutoff = Date.now() - MONTHS_MS(months);
  const deleted = { orders: 0, reservations: 0, reviews: 0 };

  const terminalStatuses = new Set(["paid", "served", "delivered", "cancelled"]);
  const oldOrders = await ctx.db
    .query("orders")
    .filter((q: any) => q.lt(q.field("createdAt"), cutoff))
    .collect();
  for (const o of oldOrders) {
    if (terminalStatuses.has(o.status)) {
      await ctx.db.delete(o._id);
      deleted.orders++;
    }
  }

  const dateCutoff = new Date(Date.now() - MONTHS_MS(months))
    .toISOString().split("T")[0];
  const oldReservations = await ctx.db
    .query("reservations")
    .filter((q: any) => q.lt(q.field("date"), dateCutoff))
    .collect();
  for (const r of oldReservations) {
    await ctx.db.delete(r._id);
    deleted.reservations++;
  }

  const oldReviews = await ctx.db
    .query("reviews")
    .filter((q: any) => q.lt(q.field("createdAt"), cutoff))
    .collect();
  for (const r of oldReviews) {
    await ctx.db.delete(r._id);
    deleted.reviews++;
  }

  return deleted;
};

export const run = mutation({
  args: { months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return runCleanup(ctx, args.months ?? 12);
  },
});

export const runInternal = internalMutation({
  args: { months: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return runCleanup(ctx, args.months ?? 12);
  },
});
