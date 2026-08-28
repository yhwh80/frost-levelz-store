import { action, query, internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000; // magic links die quickly
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // stay signed in for 90 days

// Rate limits on requesting a login link, so the endpoint can't be used to
// spam someone's inbox or burn the Resend quota.
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;

function requireServerSecret(provided: string) {
  const expected = process.env.DOWNLOAD_SERVER_SECRET;
  if (!expected || provided.length !== expected.length) {
    throw new Error("Not authorized");
  }
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) throw new Error("Not authorized");
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

/**
 * Creates a login token and returns it in plain text exactly once — the caller
 * emails it and never stores it. Only the hash is persisted.
 */
export const createLoginToken = internalMutation({
  args: { email: v.string(), tokenHash: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    const recent = await ctx.db
      .query("loginTokens")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();

    const inWindow = recent.filter((t) => t._creationTime > now - REQUEST_WINDOW_MS);
    if (inWindow.length >= MAX_REQUESTS_PER_WINDOW) {
      return { ok: false as const, reason: "rate_limited" };
    }

    // Tidy up anything expired for this address while we're here.
    for (const token of recent) {
      if (token.expiresAt < now) await ctx.db.delete(token._id);
    }

    await ctx.db.insert("loginTokens", {
      tokenHash: args.tokenHash,
      email: args.email,
      expiresAt: now + LOGIN_TOKEN_TTL_MS,
    });

    return { ok: true as const };
  },
});

/**
 * Exchanges a valid login token for a session. Creates the user on first
 * sign-in — there is no separate registration step.
 */
export const redeemLoginToken = internalMutation({
  args: { tokenHash: v.string(), sessionHash: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    const token = await ctx.db
      .query("loginTokens")
      .withIndex("by_hash", (q) => q.eq("tokenHash", args.tokenHash))
      .first();

    if (!token) return { ok: false as const, reason: "invalid" };
    if (token.usedAt) return { ok: false as const, reason: "already_used" };
    if (token.expiresAt < now) return { ok: false as const, reason: "expired" };

    await ctx.db.patch(token._id, { usedAt: now });

    let user: Doc<"users"> | null = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", token.email))
      .first();

    let userId: Id<"users">;
    if (user) {
      userId = user._id;
      await ctx.db.patch(userId, { lastSeenAt: now });
    } else {
      userId = await ctx.db.insert("users", {
        email: token.email,
        createdAt: now,
        lastSeenAt: now,
      });
    }

    await ctx.db.insert("sessions", {
      tokenHash: args.sessionHash,
      userId,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });

    return { ok: true as const, userId, email: token.email };
  },
});

async function resolveSession(
  ctx: QueryCtx,
  sessionHash: string
): Promise<{ user: Doc<"users">; subscription: Doc<"subscriptions"> | null } | null> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_hash", (q) => q.eq("tokenHash", sessionHash))
    .first();
  if (!session || session.expiresAt < Date.now()) return null;

  const user = await ctx.db.get(session.userId);
  if (!user) return null;

  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();

  return { user, subscription: subscription ?? null };
}

/** Active means: a status that grants access, and the paid period hasn't ended. */
export function subscriptionIsActive(sub: Doc<"subscriptions"> | null): boolean {
  if (!sub) return false;
  if (sub.currentPeriodEnd < Date.now()) return false;
  return ["active", "trialing", "past_due"].includes(sub.status);
}

/** Used by the streaming route to decide whether to serve a full track. */
export const checkAccess = internalQuery({
  args: { sessionHash: v.string() },
  handler: async (ctx, args) => {
    const resolved = await resolveSession(ctx, args.sessionHash);
    if (!resolved) return { signedIn: false as const, subscribed: false as const };
    return {
      signedIn: true as const,
      subscribed: subscriptionIsActive(resolved.subscription),
      userId: resolved.user._id,
      email: resolved.user.email,
      stripeCustomerId: resolved.user.stripeCustomerId,
    };
  },
});

/**
 * What the browser is allowed to know about itself. Public, but a session hash
 * is required, and it returns no ids or Stripe identifiers.
 */
export const me = query({
  args: { sessionHash: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.sessionHash) return { signedIn: false as const };
    const resolved = await resolveSession(ctx, args.sessionHash);
    if (!resolved) return { signedIn: false as const };

    const sub = resolved.subscription;
    return {
      signedIn: true as const,
      email: resolved.user.email,
      subscribed: subscriptionIsActive(sub),
      renewsAt: sub?.currentPeriodEnd,
      cancelling: sub?.cancelAtPeriodEnd ?? false,
    };
  },
});

export const signOut = internalMutation({
  args: { sessionHash: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_hash", (q) => q.eq("tokenHash", args.sessionHash))
      .first();
    if (session) await ctx.db.delete(session._id);
    return "ok";
  },
});

/**
 * Server-only entry point for requesting a login link. Gated by the shared
 * secret so only the site's own route can trigger emails.
 */
export const requestLogin = action({
  args: { secret: v.string(), email: v.string(), tokenHash: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{ ok: boolean; reason?: string; email?: string }> => {
    requireServerSecret(args.secret);

    const email = normaliseEmail(args.email);
    if (!looksLikeEmail(email)) {
      return { ok: false, reason: "That doesn't look like an email address." };
    }

    const created: { ok: boolean; reason?: string } = await ctx.runMutation(
      internal.auth.createLoginToken,
      { email, tokenHash: args.tokenHash }
    );

    if (!created.ok) {
      return {
        ok: false,
        reason: "Too many sign-in requests — try again in a few minutes.",
      };
    }

    return { ok: true, email };
  },
});

/** Sends the link. Split from requestLogin so the caller holds the plain token. */
export const deliverLoginLink = action({
  args: { secret: v.string(), email: v.string(), url: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    requireServerSecret(args.secret);
    return await ctx.runAction(internal.email.sendLoginLink, {
      to: args.email,
      url: args.url,
    });
  },
});

export const completeLogin = action({
  args: { secret: v.string(), tokenHash: v.string(), sessionHash: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{ ok: boolean; reason?: string; email?: string }> => {
    requireServerSecret(args.secret);
    const result: { ok: boolean; reason?: string; email?: string } =
      await ctx.runMutation(internal.auth.redeemLoginToken, {
        tokenHash: args.tokenHash,
        sessionHash: args.sessionHash,
      });
    return result;
  },
});

/**
 * Creates a user + session directly from a verified identity provider.
 * Only reachable with the server secret, and only ever called after the
 * provider has confirmed the address belongs to the person signing in.
 */
export const createSessionForEmail = internalMutation({
  args: { email: v.string(), sessionHash: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const email = args.email.trim().toLowerCase();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    // Signing in with Google and with a magic link land on the same account
    // when the address matches — one person, one account.
    let userId: Id<"users">;
    if (existing) {
      userId = existing._id;
      await ctx.db.patch(userId, { lastSeenAt: now });
    } else {
      userId = await ctx.db.insert("users", {
        email,
        createdAt: now,
        lastSeenAt: now,
      });
    }

    await ctx.db.insert("sessions", {
      tokenHash: args.sessionHash,
      userId,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    });

    return { ok: true as const, email };
  },
});

export const signInWithProvider = action({
  args: { secret: v.string(), email: v.string(), sessionHash: v.string() },
  handler: async (ctx, args): Promise<{ ok: boolean; email?: string }> => {
    requireServerSecret(args.secret);
    if (!looksLikeEmail(normaliseEmail(args.email))) {
      return { ok: false };
    }
    return await ctx.runMutation(internal.auth.createSessionForEmail, {
      email: normaliseEmail(args.email),
      sessionHash: args.sessionHash,
    });
  },
});

export const endSession = action({
  args: { secret: v.string(), sessionHash: v.string() },
  handler: async (ctx, args): Promise<string> => {
    requireServerSecret(args.secret);
    return await ctx.runMutation(internal.auth.signOut, {
      sessionHash: args.sessionHash,
    });
  },
});
