import { action, query, internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const MAX_NAME = 40;
const MAX_BODY = 500;
const MIN_BODY = 2;
const PAGE_SIZE = 50;

// Rate limits, per IP.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_DAY = 10;

// A form filled in faster than this wasn't filled in by a person.
const MIN_FILL_MS = 3000;

/**
 * Link detection. Comment spam almost always exists to publish a URL, so
 * refusing links removes the incentive for the overwhelming majority of it.
 */
const LINK_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /\b[a-z0-9-]+\.(com|net|org|io|co|ru|cn|xyz|top|shop|info|biz|link|click|online|site)\b/i,
  /\[url/i,
  /<a\s/i,
];

/** Nobody gets to post as Frost or as staff. */
const RESERVED_NAME_PATTERNS = [
  /frost\s*level/i,
  /frostlevelz/i,
  /\bfrost\s*a\.?\s*i\b/i,
  /\badmin\b/i,
  /\bofficial\b/i,
  /\bmoderator\b/i,
  /\bf\.?l\.?i\b/i,
];

async function getSetting(
  ctx: QueryCtx,
  key: string
): Promise<string | boolean | number | null> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  return row ? row.value : null;
}

export const listVisible = query({
  args: {},
  handler: async (ctx) => {
    if ((await getSetting(ctx, "commentsEnabled")) === false) return [];

    const rows = await ctx.db
      .query("comments")
      .withIndex("by_status_time", (q) => q.eq("status", "visible"))
      .order("desc")
      .take(PAGE_SIZE);

    // Deliberately omits ipHash — that never leaves the server.
    return rows.map((c) => ({
      _id: c._id,
      name: c.name,
      body: c.body,
      createdAt: c.createdAt,
    }));
  },
});

/**
 * Public entry point, gated by the shared server secret so it can only be
 * reached through the site's own /api/comment route. That route supplies the
 * hashed IP; if the browser could call the mutation directly it would simply
 * omit it and skip rate limiting entirely.
 */
export const submit = action({
  args: {
    secret: v.string(),
    name: v.string(),
    body: v.string(),
    website: v.optional(v.string()),
    fillMs: v.number(),
    ipHash: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; reason?: string; pending?: boolean }> => {
    const expected = process.env.DOWNLOAD_SERVER_SECRET;
    if (!expected || args.secret !== expected) {
      throw new Error("Not authorized");
    }

    const result: { ok: boolean; reason?: string; pending?: boolean } =
      await ctx.runMutation(internal.comments.post, {
        name: args.name,
        body: args.body,
        website: args.website,
        fillMs: args.fillMs,
        ipHash: args.ipHash,
      });

    if (result.ok) {
      // Frost hears about it immediately — with live comments, speed of
      // removal matters more than prevention.
      await ctx.runAction(internal.email.notifyNewComment, {
        name: args.name.trim(),
        body: args.body.trim(),
        pending: result.pending ?? false,
      });
    }

    return result;
  },
});

export const post = internalMutation({
  args: {
    name: v.string(),
    body: v.string(),
    // Honeypot: a field hidden from humans by CSS. Bots fill everything.
    website: v.optional(v.string()),
    // Milliseconds between the form rendering and being submitted.
    fillMs: v.number(),
    ipHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reject = (reason: string) => ({ ok: false as const, reason });

    if ((await getSetting(ctx, "commentsEnabled")) === false) {
      return reject("Comments are closed at the moment.");
    }

    // Silent-ish bot checks. Give a generic reason so a bot learns nothing
    // about which rule caught it.
    if (args.website && args.website.trim().length > 0) {
      return reject("Could not post that.");
    }
    if (args.fillMs < MIN_FILL_MS) {
      return reject("That was a bit quick — try again.");
    }

    const name = args.name.trim().replace(/\s+/g, " ");
    const body = args.body.trim();

    if (name.length < 1 || name.length > MAX_NAME) {
      return reject(`Name must be 1–${MAX_NAME} characters.`);
    }
    if (body.length < MIN_BODY || body.length > MAX_BODY) {
      return reject(`Comment must be ${MIN_BODY}–${MAX_BODY} characters.`);
    }
    if (RESERVED_NAME_PATTERNS.some((re) => re.test(name))) {
      return reject("Please use a different name.");
    }
    if (LINK_PATTERNS.some((re) => re.test(body))) {
      return reject("Links aren't allowed in comments.");
    }

    const now = Date.now();

    if (args.ipHash) {
      const recent = await ctx.db
        .query("comments")
        .withIndex("by_ip", (q) =>
          q.eq("ipHash", args.ipHash).gte("createdAt", now - DAY_MS)
        )
        .collect();

      if (recent.length >= MAX_PER_DAY) {
        return reject("You've posted a lot today — try again tomorrow.");
      }
      if (recent.filter((c) => c.createdAt > now - WINDOW_MS).length >= MAX_PER_WINDOW) {
        return reject("Slow down a moment, then try again.");
      }
      // Same text twice from the same person is almost always a double-submit
      // or a bot.
      if (recent.some((c) => c.body === body)) {
        return reject("You've already posted that.");
      }
    }

    // Approval mode is off by default, so comments appear immediately. Flip
    // the setting and new comments queue as hidden instead — no redeploy.
    const requiresApproval = (await getSetting(ctx, "commentsRequireApproval")) === true;

    await ctx.db.insert("comments", {
      name,
      body,
      createdAt: now,
      status: requiresApproval ? "hidden" : "visible",
      ipHash: args.ipHash,
    });

    return {
      ok: true as const,
      pending: requiresApproval,
    };
  },
});

// ---- Moderation (internal; run from the CLI until there's an admin page) ----

export const listAll = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("comments")
      .order("desc")
      .take(args.limit ?? 50);
    return rows.map((c) => ({
      id: c._id,
      status: c.status,
      name: c.name,
      body: c.body,
      at: new Date(c.createdAt).toISOString(),
    }));
  },
});

export const setStatus = internalMutation({
  args: {
    commentId: v.id("comments"),
    status: v.union(v.literal("visible"), v.literal("hidden")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.commentId, { status: args.status });
    return "ok";
  },
});

export const remove = internalMutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.commentId);
    return "deleted";
  },
});

/**
 * The kill switch and approval toggle.
 *
 *   npx convex run --prod comments:setSetting '{"key":"commentsEnabled","value":false}'
 *   npx convex run --prod comments:setSetting '{"key":"commentsRequireApproval","value":true}'
 */
export const setSetting = internalMutation({
  args: {
    key: v.string(),
    value: v.union(v.string(), v.boolean(), v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("settings", { key: args.key, value: args.value });
    }
    return `${args.key} = ${args.value}`;
  },
});
