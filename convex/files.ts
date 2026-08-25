import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const linkFileToTrack = internalMutation({
  args: {
    trackId: v.id("tracks"),
    storageId: v.id("_storage"),
    field: v.union(v.literal("mp3FileId"), v.literal("wavFileId")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.trackId, { [args.field]: args.storageId });
  },
});

const MAX_DOWNLOADS = 5;

export const getDownloadBySession = query({
  args: {
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_stripe_payment", (q) =>
        q.eq("stripePaymentId", args.stripeSessionId)
      )
      .collect();

    if (purchases.length === 0) return null;
    const purchase = purchases[0];

    // Check expiry
    if (purchase.expiresAt && Date.now() > purchase.expiresAt) {
      return { expired: true };
    }

    // Check download limit
    if ((purchase.downloadCount ?? 0) >= MAX_DOWNLOADS) {
      return { limitReached: true };
    }

    if (purchase.trackId) {
      const track = await ctx.db.get(purchase.trackId);
      if (!track) return null;
      const fileId =
        purchase.format === "wav" ? track.wavFileId : track.mp3FileId;
      return {
        title: track.title,
        format: purchase.format,
        url: fileId ? await ctx.storage.getUrl(fileId) : null,
        downloadsRemaining: MAX_DOWNLOADS - (purchase.downloadCount ?? 0),
      };
    }

    if (purchase.albumId) {
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
              title: track.title,
              trackNumber: track.trackNumber,
              format: purchase.format,
            };
          })
      );

      return {
        tracks: downloads.filter(Boolean),
        format: purchase.format,
        albumId: purchase.albumId,
        downloadsRemaining: MAX_DOWNLOADS - (purchase.downloadCount ?? 0),
      };
    }

    return null;
  },
});

export const incrementDownloadCount = mutation({
  args: {
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("purchases")
      .withIndex("by_stripe_payment", (q) =>
        q.eq("stripePaymentId", args.stripeSessionId)
      )
      .collect();

    if (purchases.length === 0) return false;
    const purchase = purchases[0];

    // Check expiry
    if (purchase.expiresAt && Date.now() > purchase.expiresAt) {
      return false;
    }

    // Check limit
    if ((purchase.downloadCount ?? 0) >= MAX_DOWNLOADS) {
      return false;
    }

    await ctx.db.patch(purchase._id, {
      downloadCount: (purchase.downloadCount ?? 0) + 1,
    });

    return true;
  },
});
