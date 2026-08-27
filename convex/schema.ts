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
    // Set once the confirmation email has gone out, so a webhook retry can't
    // email the same buyer twice.
    emailSentAt: v.optional(v.number()),
  }).index("by_email", ["email"])
    .index("by_stripe_payment", ["stripePaymentId"]),

  comments: defineTable({
    name: v.string(),
    body: v.string(),
    createdAt: v.number(),
    // "visible" shows on the site. "hidden" is set either by Frost deleting it
    // or by the approval queue when that mode is switched on.
    status: v.union(v.literal("visible"), v.literal("hidden")),
    // Kept only for rate limiting and abuse handling, never displayed.
    ipHash: v.optional(v.string()),
  })
    .index("by_status_time", ["status", "createdAt"])
    .index("by_ip", ["ipHash", "createdAt"]),

  // Single-row key/value settings so things can be switched at runtime without
  // a redeploy — notably the comments kill switch and approval mode.
  settings: defineTable({
    key: v.string(),
    value: v.union(v.string(), v.boolean(), v.number()),
  }).index("by_key", ["key"]),
});
