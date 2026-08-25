import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const tracks = await ctx.db
      .query("tracks")
      .filter((q) => q.eq(q.field("released"), true))
      .collect();

    return Promise.all(
      tracks.map(async (track) => ({
        _id: track._id,
        title: track.title,
        year: track.year,
        priceMp3: track.priceMp3,
        priceWav: track.priceWav,
        albumId: track.albumId,
        trackNumber: track.trackNumber,
        released: track.released,
        coverImageUrl: track.coverImageId
          ? await ctx.storage.getUrl(track.coverImageId)
          : track.coverImageUrl ?? null,
        previewUrl: track.previewFileId
          ? await ctx.storage.getUrl(track.previewFileId)
          : track.previewUrl ?? null,
      }))
    );
  },
});

export const getById = query({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track || !track.released) return null;
    // Field-picked on purpose: spreading the doc leaked mp3FileId/wavFileId.
    return {
      _id: track._id,
      title: track.title,
      year: track.year,
      priceMp3: track.priceMp3,
      priceWav: track.priceWav,
      albumId: track.albumId,
      trackNumber: track.trackNumber,
      released: track.released,
      hasMp3: !!track.mp3FileId,
      hasWav: !!track.wavFileId,
      coverImageUrl: track.coverImageId
        ? await ctx.storage.getUrl(track.coverImageId)
        : track.coverImageUrl ?? null,
      previewUrl: track.previewFileId
        ? await ctx.storage.getUrl(track.previewFileId)
        : track.previewUrl ?? null,
    };
  },
});

export const create = internalMutation({
  args: {
    title: v.string(),
    year: v.string(),
    priceMp3: v.number(),
    priceWav: v.number(),
    albumId: v.optional(v.id("albums")),
    trackNumber: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    released: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tracks", args);
  },
});
