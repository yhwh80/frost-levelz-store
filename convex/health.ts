import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Read at call time, not module load, so an env change takes effect without a
 * redeploy. `target` exists so the check can be pointed elsewhere for testing
 * WITHOUT touching SITE_URL — that variable also builds Stripe's checkout
 * redirect URLs, and overriding it on production once sent buyers to a dead
 * domain.
 */
function siteUrl(): string {
  return process.env.SITE_URL ?? "https://frostlevelz.com";
}

// Don't shout about a single blip — a slow response or a redeploy can fail one
// check. Two in a row (30 minutes) means something is actually wrong.
const FAILURES_BEFORE_ALERT = 2;

const STATE_KEY = "healthState"; // "up" | "down"
const FAIL_KEY = "healthConsecutiveFailures";

export const readState = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("settings").collect();
    const get = (k: string) => rows.find((r) => r.key === k)?.value;
    return {
      state: (get(STATE_KEY) as string) ?? "up",
      failures: (get(FAIL_KEY) as number) ?? 0,
    };
  },
});

export const writeState = internalMutation({
  args: { state: v.string(), failures: v.number() },
  handler: async (ctx, args) => {
    for (const [key, value] of [
      [STATE_KEY, args.state],
      [FAIL_KEY, args.failures],
    ] as const) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (existing) await ctx.db.patch(existing._id, { value });
      else await ctx.db.insert("settings", { key, value });
    }
  },
});

/**
 * Checks the shop is actually usable, not merely reachable.
 *
 * A plain uptime ping only proves the homepage returns 200. That would stay
 * green while the catalogue was empty or downloads were broken — so this also
 * verifies the catalogue has tracks and the download endpoint is answering.
 *
 * Runs in Convex, which is separate infrastructure from the VPS, so it still
 * fires when the site itself is down.
 */
export const check = internalAction({
  args: { target: v.optional(v.string()), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<string> => {
    const problems: string[] = [];
    const SITE = args.target ?? siteUrl();

    // 1. Is the site up?
    try {
      const res = await fetch(SITE, {
        method: "GET",
        headers: { "User-Agent": "frostlevelz-healthcheck" },
      });
      if (!res.ok) problems.push(`homepage returned HTTP ${res.status}`);
    } catch (err) {
      problems.push(`homepage unreachable: ${String(err).slice(0, 120)}`);
    }

    // 2. Is there anything to sell? An empty catalogue means a broken deploy
    //    or a wiped database, and looks fine to a plain uptime check.
    try {
      const tracks = await ctx.runQuery(internal.health.countReleasedTracks, {});
      if (tracks === 0) problems.push("catalogue is EMPTY — no released tracks");
    } catch (err) {
      problems.push(`catalogue check failed: ${String(err).slice(0, 120)}`);
    }

    // 3. Is the download endpoint alive? Without a session id it should answer
    //    400, which proves the route is running rather than 502/timing out.
    try {
      const res = await fetch(`${SITE}/api/download`, { method: "GET" });
      if (res.status >= 500) {
        problems.push(`download endpoint returned HTTP ${res.status}`);
      }
    } catch (err) {
      problems.push(`download endpoint unreachable: ${String(err).slice(0, 120)}`);
    }

    const previous = await ctx.runQuery(internal.health.readState, {});
    const healthy = problems.length === 0;

    if (healthy) {
      // Recovered — tell them once, then go quiet.
      if (previous.state === "down" && !args.dryRun) {
        await ctx.runAction(internal.email.sendHealthAlert, {
          down: false,
          details: "The site is responding normally again.",
        });
      }
      await ctx.runMutation(internal.health.writeState, {
        state: "up",
        failures: 0,
      });
      return "ok";
    }

    const failures = previous.failures + 1;
    const shouldAlert =
      failures >= FAILURES_BEFORE_ALERT && previous.state !== "down";

    if (shouldAlert && !args.dryRun) {
      await ctx.runAction(internal.email.sendHealthAlert, {
        down: true,
        details: problems.join("\n"),
      });
    }

    await ctx.runMutation(internal.health.writeState, {
      state: failures >= FAILURES_BEFORE_ALERT ? "down" : previous.state,
      failures,
    });

    return `problems: ${problems.join("; ")}`;
  },
});

export const countReleasedTracks = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tracks = await ctx.db
      .query("tracks")
      .filter((q) => q.eq(q.field("released"), true))
      .collect();
    return tracks.length;
  },
});
