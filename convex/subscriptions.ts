import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mirrors a Stripe subscription into Convex. Called from webhook events only.
 *
 * Keyed on the Stripe subscription id so the same event arriving twice (Stripe
 * retries, or created + updated firing together) updates one row rather than
 * creating duplicates.
 */
export const upsertFromStripe = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.string(),
    email: v.string(),
    status: v.string(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const email = args.email.trim().toLowerCase();

    // Find the account this belongs to, creating it if the person paid before
    // their account row existed for any reason.
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        email,
        createdAt: now,
        stripeCustomerId: args.stripeCustomerId,
      });
      user = await ctx.db.get(userId);
    } else if (user.stripeCustomerId !== args.stripeCustomerId) {
      await ctx.db.patch(user._id, { stripeCustomerId: args.stripeCustomerId });
    }
    if (!user) return "no user";

    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    const row = {
      userId: user._id,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripeCustomerId: args.stripeCustomerId,
      status: args.status,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? false,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, row);
      return "updated";
    }
    await ctx.db.insert("subscriptions", row);
    return "created";
  },
});

export const findUserEmail = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();
    return user?.email ?? null;
  },
});

/** Support view — who is subscribed, without exposing it publicly. */
export const listSubscribers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const subs = await ctx.db.query("subscriptions").collect();
    const out = [];
    for (const s of subs) {
      const user = await ctx.db.get(s.userId);
      // Never let a bad stored date throw — a support view that crashes is
      // worse than one showing "unknown".
      const end = s.currentPeriodEnd;
      const renews =
        typeof end === "number" && Number.isFinite(end) && end > 0
          ? new Date(end).toISOString().slice(0, 10)
          : "unknown";
      out.push({
        email: user?.email ?? "?",
        status: s.status,
        renews,
        cancelling: s.cancelAtPeriodEnd ?? false,
      });
    }
    return out;
  },
});
