import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const albums = await ctx.db
      .query("albums")
      .filter((q) => q.eq(q.field("released"), true))
      .collect();

    return Promise.all(
      albums.map(async (album) => ({
        ...album,
        coverImageUrl: album.coverImageId
          ? await ctx.storage.getUrl(album.coverImageId)
          : album.coverImageUrl ?? null,
      }))
    );
  },
});

export const getById = query({
  args: { albumId: v.id("albums") },
  handler: async (ctx, args) => {
    const album = await ctx.db.get(args.albumId);
    if (!album) return null;
    return {
      ...album,
      coverImageUrl: album.coverImageId
        ? await ctx.storage.getUrl(album.coverImageId)
        : album.coverImageUrl ?? null,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    year: v.string(),
    trackCount: v.number(),
    priceMp3: v.number(),
    priceWav: v.number(),
    description: v.optional(v.string()),
    released: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("albums", args);
  },
});
