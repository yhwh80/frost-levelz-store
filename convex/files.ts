import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const linkFileToTrack = mutation({
  args: {
    trackId: v.id("tracks"),
    storageId: v.id("_storage"),
    field: v.union(v.literal("mp3FileId"), v.literal("wavFileId")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.trackId, { [args.field]: args.storageId });
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
      const fileId =
        purchase.format === "wav" ? track.wavFileId : track.mp3FileId;
      if (!fileId) return null;
      return {
        url: await ctx.storage.getUrl(fileId),
        title: track.title,
        format: purchase.format,
      };
    }

    if (purchase.albumId) {
      // For album purchases, return all track download URLs
      const tracks = await ctx.db
        .query("tracks")
        .filter((q) => q.eq(q.field("albumId"), purchase.albumId))
        .collect();

      const downloads = await Promise.all(
        tracks
          .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0))
          .map(async (track) => {
            const fileId =
              purchase.format === "wav" ? track.wavFileId : track.mp3FileId;
            if (!fileId) return null;
            return {
              url: await ctx.storage.getUrl(fileId),
              title: track.title,
              trackNumber: track.trackNumber,
              format: purchase.format,
            };
          })
      );

      return {
        tracks: downloads.filter(Boolean),
        format: purchase.format,
      };
    }

    return null;
  },
});

export const getDownloadBySession = query({
  args: {
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find purchase by stripe payment ID
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_stripe_payment", (q) =>
        q.eq("stripePaymentId", args.stripeSessionId)
      )
      .collect();

    if (purchases.length === 0) return null;
    const purchase = purchases[0];

    if (purchase.trackId) {
      const track = await ctx.db.get(purchase.trackId);
      if (!track) return null;
      const fileId =
        purchase.format === "wav" ? track.wavFileId : track.mp3FileId;
      return {
        title: track.title,
        format: purchase.format,
        url: fileId ? await ctx.storage.getUrl(fileId) : null,
      };
    }

    return null;
  },
});
