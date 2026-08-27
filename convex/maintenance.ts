import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Storage housekeeping. Internal only, and additionally guarded by a confirm
 * token so a mistyped `npx convex run` can't quietly delete masters.
 *
 * Re-uploading tracks leaves the previous files behind — Convex doesn't
 * garbage-collect them — so orphans accumulate silently and count against the
 * storage allowance. Run with mode "orphans" after any re-upload:
 *
 *   npx convex run --prod maintenance:pruneStorage '{"mode":"orphans","confirm":"PRUNE","dryRun":true}'
 *
 * Deletes are batched because a single mutation shouldn't do unbounded work;
 * keep calling until `remaining` is 0.
 */
/**
 * Update catalogue prices in place.
 *
 * Prices live in the database, not the code, so re-seeding is NOT a way to
 * change them — clearCatalog deletes tracks and albums, which would orphan the
 * trackId/albumId on every existing purchase and break those customers'
 * downloads. Always patch in place.
 *
 *   npx convex run --prod maintenance:setPrices '{"trackMp3":0.99,"albumMp3":5.99,"dryRun":true}'
 */
export const setPrices = internalMutation({
  args: {
    trackMp3: v.optional(v.number()),
    albumMp3: v.optional(v.number()),
    dryRun: v.boolean(),
  },
  handler: async (ctx, args) => {
    const changes: string[] = [];

    if (args.trackMp3 !== undefined) {
      const tracks = await ctx.db.query("tracks").collect();
      for (const track of tracks) {
        if (track.priceMp3 === args.trackMp3) continue;
        changes.push(`track "${track.title}": ${track.priceMp3} -> ${args.trackMp3}`);
        if (!args.dryRun) {
          await ctx.db.patch(track._id, { priceMp3: args.trackMp3 });
        }
      }
    }

    if (args.albumMp3 !== undefined) {
      const albums = await ctx.db.query("albums").collect();
      for (const album of albums) {
        if (album.priceMp3 === args.albumMp3) continue;
        changes.push(`album "${album.title}": ${album.priceMp3} -> ${args.albumMp3}`);
        if (!args.dryRun) {
          await ctx.db.patch(album._id, { priceMp3: args.albumMp3 });
        }
      }
    }

    return {
      dryRun: args.dryRun,
      changed: changes.length,
      sample: changes.slice(0, 5),
    };
  },
});

export const pruneStorage = internalMutation({
  args: {
    // "orphans" = files no document references. "all" = every stored file,
    // intended only for wiping a sandbox deployment.
    mode: v.union(v.literal("orphans"), v.literal("all")),
    confirm: v.string(),
    dryRun: v.boolean(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.confirm !== "PRUNE") {
      throw new Error('Refusing to run: pass confirm:"PRUNE"');
    }

    // Every storage id referenced by a live document.
    const referenced = new Set<string>();
    for (const track of await ctx.db.query("tracks").collect()) {
      for (const id of [
        track.mp3FileId,
        track.wavFileId,
        track.previewFileId,
        track.coverImageId,
      ]) {
        if (id) referenced.add(id);
      }
    }
    for (const album of await ctx.db.query("albums").collect()) {
      if (album.coverImageId) referenced.add(album.coverImageId);
    }

    const files = await ctx.db.system.query("_storage").collect();
    const targets =
      args.mode === "all"
        ? files
        : files.filter((f) => !referenced.has(f._id));

    const limit = args.limit ?? 50;
    const batch = targets.slice(0, limit);

    let deletedBytes = 0;
    if (!args.dryRun) {
      for (const file of batch) {
        await ctx.storage.delete(file._id as Id<"_storage">);
        deletedBytes += file.size;
      }
    } else {
      for (const file of batch) deletedBytes += file.size;
    }

    return {
      dryRun: args.dryRun,
      mode: args.mode,
      totalFiles: files.length,
      referencedFiles: referenced.size,
      targeted: targets.length,
      processed: batch.length,
      processedMB: Math.round((deletedBytes / 1048576) * 10) / 10,
      remaining: targets.length - batch.length,
    };
  },
});
