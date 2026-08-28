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
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  },
});

/**
 * Marks the confirmation as sent and reports whether this caller was the one
 * that claimed it — so a Stripe webhook retry can't email the buyer twice.
 */
export const claimEmailSend = internalMutation({
  args: { stripePaymentId: v.string() },
  handler: async (ctx, args) => {
    const purchase = await ctx.db
      .query("purchases")
      .withIndex("by_stripe_payment", (q) =>
        q.eq("stripePaymentId", args.stripePaymentId)
      )
      .first();

    if (!purchase) return { claimed: false as const };
    if (purchase.emailSentAt) return { claimed: false as const };

    await ctx.db.patch(purchase._id, { emailSentAt: Date.now() });
    return {
      claimed: true as const,
      expiresAt: purchase.expiresAt,
    };
  },
});

/** Human-readable name of what was bought, for the confirmation email. */
export const describePurchase = internalQuery({
  args: { stripePaymentId: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const purchase = await ctx.db
      .query("purchases")
      .withIndex("by_stripe_payment", (q) =>
        q.eq("stripePaymentId", args.stripePaymentId)
      )
      .first();
    if (!purchase) return "Your purchase";

    if (purchase.trackId) {
      const track = await ctx.db.get(purchase.trackId);
      return track?.title ?? "Your purchase";
    }
    if (purchase.albumId) {
      const album = await ctx.db.get(purchase.albumId);
      return album?.title ?? "Your purchase";
    }
    return "Your purchase";
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
