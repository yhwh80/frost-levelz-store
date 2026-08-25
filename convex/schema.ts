import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  albums: defineTable({
    title: v.string(),
    year: v.string(),
    trackCount: v.number(),
    priceMp3: v.number(),
    priceWav: v.number(),
    coverImageId: v.optional(v.id("_storage")),
    coverImageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    released: v.boolean(),
  }),

  tracks: defineTable({
    title: v.string(),
    year: v.string(),
    priceMp3: v.number(),
    priceWav: v.number(),
    albumId: v.optional(v.id("albums")),
    trackNumber: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    previewFileId: v.optional(v.id("_storage")),
    previewUrl: v.optional(v.string()),
    mp3FileId: v.optional(v.id("_storage")),
    wavFileId: v.optional(v.id("_storage")),
    coverImageId: v.optional(v.id("_storage")),
    coverImageUrl: v.optional(v.string()),
    released: v.boolean(),
  }),

  purchases: defineTable({
    trackId: v.optional(v.id("tracks")),
    albumId: v.optional(v.id("albums")),
    format: v.union(v.literal("mp3"), v.literal("wav")),
    email: v.string(),
    amountPaid: v.number(),
    stripePaymentId: v.string(),
    purchasedAt: v.number(),
    downloadCount: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  }).index("by_email", ["email"])
    .index("by_stripe_payment", ["stripePaymentId"]),
});
