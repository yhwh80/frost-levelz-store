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

/**
 * Removes an account and everything attached to it — for genuine deletion
 * requests under UK GDPR, and for clearing test accounts.
 *
 * Purchase records are deliberately left alone: tax rules require keeping
 * sales records for six years, and the privacy policy says so.
 */
export const deleteAccount = internalMutation({
  args: { email: v.string(), confirm: v.string() },
  handler: async (ctx, args) => {
    if (args.confirm !== "DELETE") {
      throw new Error('Refusing to run: pass confirm:"DELETE"');
    }
    const email = args.email.trim().toLowerCase();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return "no such account";

    let removed = 0;
    for (const s of await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()) {
      await ctx.db.delete(s._id);
      removed++;
    }
    for (const t of await ctx.db
      .query("loginTokens")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()) {
      await ctx.db.delete(t._id);
      removed++;
    }
    for (const sub of await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect()) {
      await ctx.db.delete(sub._id);
      removed++;
    }
    await ctx.db.delete(user._id);

    return `deleted ${email} and ${removed} related records (purchase history retained for tax)`;
  },
});

/**
 * Repairs a subscription row whose currentPeriodEnd was stored as NaN or 0
 * (from reading current_period_end off the subscription object, which Stripe
 * moved onto the subscription item). Pass the correct unix seconds from Stripe.
 */
export const fixSubscriptionPeriodEnd = internalMutation({
  args: { stripeSubscriptionId: v.string(), periodEndSeconds: v.number() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();
    if (!sub) return "not found";

    await ctx.db.patch(sub._id, {
      currentPeriodEnd: args.periodEndSeconds * 1000,
      updatedAt: Date.now(),
    });
    return `set to ${new Date(args.periodEndSeconds * 1000).toISOString()}`;
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
