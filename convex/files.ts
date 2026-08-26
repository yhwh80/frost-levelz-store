import {
  action,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

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

type DownloadFile = {
  title: string;
  trackNumber?: number;
  url: string;
};

export type DownloadResult =
  | { status: "notfound" }
  | { status: "expired" }
  | { status: "limit" }
  | { status: "unavailable" }
  | {
      status: "ok";
      kind: "track" | "album";
      title: string;
      format: "mp3" | "wav";
      files: DownloadFile[];
      downloadsRemaining: number;
      // Identifies the underlying product (album/track id) rather than the
      // purchase, so the download route can cache one built zip per album and
      // reuse it across every buyer.
      cacheGroup: string;
    };

/**
 * Constant-time string comparison. The server secret is the only thing standing
 * between the public internet and every master file, so don't leak its prefix
 * through early-exit timing.
 */
function secretMatches(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function requireServerSecret(provided: string) {
  const expected = process.env.DOWNLOAD_SERVER_SECRET;
  if (!expected) {
    throw new Error("DOWNLOAD_SERVER_SECRET is not configured");
  }
  if (!secretMatches(provided, expected)) {
    throw new Error("Not authorized");
  }
}

function fileIdFor(track: Doc<"tracks">, format: "mp3" | "wav") {
  return format === "wav" ? track.wavFileId : track.mp3FileId;
}

async function findPurchase(
  ctx: QueryCtx,
  stripeSessionId: string
): Promise<Doc<"purchases"> | null> {
  const purchases = await ctx.db
    .query("purchases")
    .withIndex("by_stripe_payment", (q) =>
      q.eq("stripePaymentId", stripeSessionId)
    )
    .collect();
  return purchases.length > 0 ? purchases[0] : null;
}

/**
 * Internal only — returns real storage URLs. Never expose this to the browser:
 * Convex storage URLs are unauthenticated and permanent, so handing one to a
 * client would make the download limit and expiry window meaningless.
 */
export const getDownloadFiles = internalQuery({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args): Promise<DownloadResult> => {
    const purchase = await findPurchase(ctx, args.stripeSessionId);
    if (!purchase) return { status: "notfound" };

    if (purchase.expiresAt && Date.now() > purchase.expiresAt) {
      return { status: "expired" };
    }

    const used = purchase.downloadCount ?? 0;
    if (used >= MAX_DOWNLOADS) return { status: "limit" };
    const downloadsRemaining = MAX_DOWNLOADS - used;

    if (purchase.trackId) {
      const track = await ctx.db.get(purchase.trackId);
      if (!track) return { status: "notfound" };
      const fileId = fileIdFor(track, purchase.format);
      if (!fileId) return { status: "unavailable" };
      const url = await ctx.storage.getUrl(fileId);
      if (!url) return { status: "unavailable" };
      return {
        status: "ok",
        kind: "track",
        title: track.title,
        format: purchase.format,
        files: [{ title: track.title, url }],
        downloadsRemaining,
        cacheGroup: purchase.trackId,
      };
    }

    if (purchase.albumId) {
      const album = await ctx.db.get(purchase.albumId);
      const tracks = await ctx.db
        .query("tracks")
        .filter((q) => q.eq(q.field("albumId"), purchase.albumId))
        .collect();

      const files: DownloadFile[] = [];
      for (const track of tracks.sort(
        (a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0)
      )) {
        const fileId = fileIdFor(track, purchase.format);
        if (!fileId) continue;
        const url = await ctx.storage.getUrl(fileId);
        if (!url) continue;
        files.push({ title: track.title, trackNumber: track.trackNumber, url });
      }

      if (files.length === 0) return { status: "unavailable" };

      return {
        status: "ok",
        kind: "album",
        title: album?.title ?? "Album",
        format: purchase.format,
        files,
        downloadsRemaining,
        cacheGroup: purchase.albumId,
      };
    }

    return { status: "notfound" };
  },
});

/**
 * Public, but useless without the shared server secret. Called only from the
 * Next.js /api/download route (server side), never from the browser.
 */
export const authorizeDownload = action({
  args: { secret: v.string(), stripeSessionId: v.string() },
  handler: async (ctx, args): Promise<DownloadResult> => {
    requireServerSecret(args.secret);
    return await ctx.runQuery(internal.files.getDownloadFiles, {
      stripeSessionId: args.stripeSessionId,
    });
  },
});

/**
 * Called by the download route only after the files have been fetched
 * successfully, so a failed transfer doesn't cost the customer a download.
 */
export const consumeDownload = action({
  args: { secret: v.string(), stripeSessionId: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    requireServerSecret(args.secret);
    return await ctx.runMutation(internal.files.incrementDownloadCount, {
      stripeSessionId: args.stripeSessionId,
    });
  },
});

export const incrementDownloadCount = internalMutation({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    const purchase = await findPurchase(ctx, args.stripeSessionId);
    if (!purchase) return false;

    if (purchase.expiresAt && Date.now() > purchase.expiresAt) return false;

    const used = purchase.downloadCount ?? 0;
    if (used >= MAX_DOWNLOADS) return false;

    await ctx.db.patch(purchase._id, { downloadCount: used + 1 });
    return true;
  },
});

/**
 * Safe metadata for the success page. Deliberately returns no URLs and no
 * storage IDs — the actual bytes are only ever served through /api/download.
 */
export const getPurchaseStatus = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    const purchase = await findPurchase(ctx, args.stripeSessionId);
    if (!purchase) return null;

    if (purchase.expiresAt && Date.now() > purchase.expiresAt) {
      return { status: "expired" as const };
    }

    const used = purchase.downloadCount ?? 0;
    if (used >= MAX_DOWNLOADS) return { status: "limit" as const };
    const downloadsRemaining = MAX_DOWNLOADS - used;

    if (purchase.trackId) {
      const track = await ctx.db.get(purchase.trackId);
      if (!track) return null;
      return {
        status: "ok" as const,
        kind: "track" as const,
        title: track.title,
        format: purchase.format,
        trackCount: 1,
        downloadsRemaining,
      };
    }

    if (purchase.albumId) {
      const album = await ctx.db.get(purchase.albumId);
      const tracks = await ctx.db
        .query("tracks")
        .filter((q) => q.eq(q.field("albumId"), purchase.albumId))
        .collect();
      const available = tracks.filter((t) => fileIdFor(t, purchase.format));
      return {
        status: "ok" as const,
        kind: "album" as const,
        title: album?.title ?? "Album",
        format: purchase.format,
        trackCount: available.length,
        downloadsRemaining,
      };
    }

    return null;
  },
});

/**
 * Guards checkout: we must never sell a format we can't actually deliver.
 */
export const hasFormat = internalQuery({
  args: {
    trackId: v.optional(v.id("tracks")),
    albumId: v.optional(v.id("albums")),
    format: v.union(v.literal("mp3"), v.literal("wav")),
  },
  handler: async (ctx, args): Promise<boolean> => {
    if (args.trackId) {
      const track = await ctx.db.get(args.trackId);
      return !!(track && fileIdFor(track, args.format));
    }
    if (args.albumId) {
      const tracks = await ctx.db
        .query("tracks")
        .filter((q) => q.eq(q.field("albumId"), args.albumId))
        .collect();
      return tracks.length > 0 && tracks.every((t) => !!fileIdFor(t, args.format));
    }
    return false;
  },
});

/**
 * Kept public and callable so the old success pages still in someone's browser
 * tab don't hard-crash; it now returns metadata only, never a URL.
 */
export const getDownloadBySession = query({
  args: { stripeSessionId: v.string() },
  handler: async (ctx, args) => {
    const purchase = await findPurchase(ctx, args.stripeSessionId);
    if (!purchase) return null;
    if (purchase.expiresAt && Date.now() > purchase.expiresAt) {
      return { expired: true as const };
    }
    if ((purchase.downloadCount ?? 0) >= MAX_DOWNLOADS) {
      return { limitReached: true as const };
    }
    return { ready: true as const };
  },
});
