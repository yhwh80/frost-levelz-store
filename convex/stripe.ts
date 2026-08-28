"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import Stripe from "stripe";

export const createCheckoutSession = action({
  args: {
    trackId: v.optional(v.id("tracks")),
    albumId: v.optional(v.id("albums")),
    format: v.union(v.literal("mp3"), v.literal("wav")),
  },
  handler: async (ctx, args) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error("Stripe is not configured yet");
    }

    const stripe = new Stripe(stripeKey);

    let name: string;
    let price: number;
    let coverImageUrl: string | null = null;

    if (args.trackId) {
      const track = await ctx.runQuery(api.tracks.getById, {
        trackId: args.trackId,
      });
      if (!track) throw new Error("Track not found");
      name = track.title;
      price = args.format === "wav" ? track.priceWav : track.priceMp3;
      coverImageUrl = track.coverImageUrl;
    } else if (args.albumId) {
      const album = await ctx.runQuery(api.albums.getById, {
        albumId: args.albumId,
      });
      if (!album) throw new Error("Album not found");
      name = album.title;
      price = args.format === "wav" ? album.priceWav : album.priceMp3;
      coverImageUrl = album.coverImageUrl;
    } else {
      throw new Error("Must provide trackId or albumId");
    }

    // Never take money for a format we can't actually deliver. This is the
    // server-side backstop for the UI hiding unavailable formats.
    const deliverable: boolean = await ctx.runQuery(internal.files.hasFormat, {
      trackId: args.trackId,
      albumId: args.albumId,
      format: args.format,
    });
    if (!deliverable) {
      throw new Error(
        `${args.format.toUpperCase()} isn't available for "${name}" yet. Please try another format.`
      );
    }

    const siteUrl = process.env.SITE_URL ?? "https://frostlevelz.com";

    const images = coverImageUrl
      ? [
          coverImageUrl.startsWith("http")
            ? coverImageUrl
            : `${siteUrl}${coverImageUrl}`,
        ]
      : [];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "link"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${name} (${args.format.toUpperCase()})`,
              images,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: siteUrl,
      metadata: {
        trackId: args.trackId ?? "",
        albumId: args.albumId ?? "",
        format: args.format,
      },
    });

    return session.url;
  },
});

const SUBSCRIPTION_PRICE_PENCE = 299;

/**
 * £2.99/month streaming subscription. Secret-gated because the caller must
 * already be signed in — the site's route checks the session first, so the
 * subscription is always attached to a known account.
 */
export const createSubscriptionCheckout = action({
  args: { secret: v.string(), email: v.string() },
  handler: async (ctx, args): Promise<string | null> => {
    const expected = process.env.DOWNLOAD_SERVER_SECRET;
    if (!expected || args.secret !== expected) throw new Error("Not authorized");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("Stripe is not configured yet");
    const stripe = new Stripe(stripeKey);

    const siteUrl = process.env.SITE_URL ?? "https://frostlevelz.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // Pinning the email means the subscription can only ever attach to the
      // account that started checkout.
      customer_email: args.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Frost Levelz — Full Access",
              description: "Stream every track in full. Cancel any time.",
            },
            unit_amount: SUBSCRIPTION_PRICE_PENCE,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/account?subscribed=1`,
      cancel_url: `${siteUrl}/account`,
      metadata: { kind: "subscription", email: args.email },
    });

    return session.url;
  },
});

/**
 * Stripe's own billing portal, so cancelling is self-service. UK consumer law
 * expects cancelling to be as easy as subscribing, and this is the least
 * error-prone way to provide that.
 */
export const createPortalSession = action({
  args: { secret: v.string(), stripeCustomerId: v.string() },
  handler: async (ctx, args): Promise<string | null> => {
    const expected = process.env.DOWNLOAD_SERVER_SECRET;
    if (!expected || args.secret !== expected) throw new Error("Not authorized");

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("Stripe is not configured yet");
    const stripe = new Stripe(stripeKey);

    const siteUrl = process.env.SITE_URL ?? "https://frostlevelz.com";
    const session = await stripe.billingPortal.sessions.create({
      customer: args.stripeCustomerId,
      return_url: `${siteUrl}/account`,
    });
    return session.url;
  },
});

export const handleWebhook = action({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey || !webhookSecret) {
      throw new Error("Stripe not configured");
    }

    const stripe = new Stripe(stripeKey);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        args.body,
        args.signature,
        webhookSecret
      );
    } catch {
      throw new Error("Invalid signature");
    }

    // ---- Subscription lifecycle ----
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      // The email isn't on the subscription object, so look it up — first from
      // an account we already linked, then from Stripe itself.
      let email: string | null = await ctx.runQuery(
        internal.subscriptions.findUserEmail,
        { stripeCustomerId: customerId }
      );

      if (!email) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (!("deleted" in customer)) email = customer.email ?? null;
        } catch (err) {
          console.error("Could not retrieve Stripe customer:", err);
        }
      }

      if (email) {
        // A deleted subscription is expressed as an ended status rather than a
        // row deletion, so history is preserved.
        const status =
          event.type === "customer.subscription.deleted" ? "canceled" : sub.status;

        await ctx.runMutation(internal.subscriptions.upsertFromStripe, {
          stripeSubscriptionId: sub.id,
          stripeCustomerId: customerId,
          email,
          status,
          currentPeriodEnd: (sub as unknown as { current_period_end: number })
            .current_period_end * 1000,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        });
      } else {
        console.error("Subscription event with no resolvable email:", sub.id);
      }

      return "OK";
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Subscription checkouts are handled by the subscription events above,
      // which carry the status and period end. Nothing to do here.
      if (session.mode === "subscription") return "OK";

      const trackId = session.metadata?.trackId || undefined;
      const albumId = session.metadata?.albumId || undefined;
      const format = (session.metadata?.format as "mp3" | "wav") || "mp3";
      const email =
        session.customer_details?.email ?? session.customer_email ?? "";
      const amountPaid = (session.amount_total ?? 0) / 100;

      await ctx.runMutation(internal.purchases.create, {
        trackId: trackId ? (trackId as never) : undefined,
        albumId: albumId ? (albumId as never) : undefined,
        format,
        email,
        amountPaid,
        stripePaymentId: session.id,
      });

      // Confirmation email. Deliberately after the purchase row exists, and
      // wrapped so a mail failure can never fail the webhook — Stripe would
      // retry it and we'd risk duplicate work over an email we can resend.
      if (email) {
        try {
          const claim: { claimed: boolean; expiresAt?: number } =
            await ctx.runMutation(internal.purchases.claimEmailSend, {
              stripePaymentId: session.id,
            });

          if (claim.claimed) {
            const title: string = await ctx.runQuery(
              internal.purchases.describePurchase,
              { stripePaymentId: session.id }
            );
            await ctx.runAction(internal.email.sendPurchaseConfirmation, {
              to: email,
              title,
              format,
              kind: albumId ? "album" : "track",
              stripeSessionId: session.id,
              expiresAt: claim.expiresAt,
            });
          }
        } catch (err) {
          console.error("Confirmation email failed:", err);
        }
      }
    }

    return "OK";
  },
});
