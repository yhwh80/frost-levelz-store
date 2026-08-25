import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    trackId: v.optional(v.id("tracks")),
    albumId: v.optional(v.id("albums")),
    format: v.union(v.literal("mp3"), v.literal("wav")),
    email: v.string(),
    amountPaid: v.number(),
    stripePaymentId: v.string(),
  },
  handler: async (ctx, args) => {
    // Stripe retries webhooks, so the same session can arrive more than once.
    // Without this the retry creates a duplicate purchase row.
    const existing = await ctx.db
      .query("purchases")
      .withIndex("by_stripe_payment", (q) =>
        q.eq("stripePaymentId", args.stripePaymentId)
      )
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("purchases", {
      ...args,
      purchasedAt: Date.now(),
      downloadCount: 0,
      expiresAt: Date.now() + 72 * 60 * 60 * 1000, // 72 hours
    });
  },
});

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("purchases")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
  },
});
