import { query, mutation } from "./_generated/server";
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
        ...track,
        coverImageUrl: track.coverImageId
          ? await ctx.storage.getUrl(track.coverImageId)
          : track.coverImageUrl ?? null,
        previewUrl: track.previewFileId
          ? await ctx.storage.getUrl(track.previewFileId)
          : null,
      }))
    );
  },
});

export const getById = query({
  args: { trackId: v.id("tracks") },
  handler: async (ctx, args) => {
    const track = await ctx.db.get(args.trackId);
    if (!track) return null;
    return {
      ...track,
      coverImageUrl: track.coverImageId
        ? await ctx.storage.getUrl(track.coverImageId)
        : track.coverImageUrl ?? null,
      previewUrl: track.previewFileId
        ? await ctx.storage.getUrl(track.previewFileId)
        : null,
    };
  },
});

export const create = mutation({
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
