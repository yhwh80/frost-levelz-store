import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    trackId: v.optional(v.id("tracks")),
    albumId: v.optional(v.id("albums")),
    format: v.union(v.literal("mp3"), v.literal("wav")),
    email: v.string(),
    amountPaid: v.number(),
    stripePaymentId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("purchases", {
      ...args,
      purchasedAt: Date.now(),
    });
  },
});

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("purchases")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
  },
});

export const getDownloadUrl = query({
  args: {
    purchaseId: v.id("purchases"),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db.get(args.purchaseId);
    if (!purchase) return null;

    if (purchase.trackId) {
      const track = await ctx.db.get(purchase.trackId);
      if (!track) return null;
      const fileId = purchase.format === "wav" ? track.wavFileId : track.mp3FileId;
      if (!fileId) return null;
      return await ctx.storage.getUrl(fileId);
    }

    return null;
  },
});
