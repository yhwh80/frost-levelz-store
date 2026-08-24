"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
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

    const siteUrl = process.env.SITE_URL ?? "https://frostlevelz.com";

    const images = coverImageUrl
      ? [
          coverImageUrl.startsWith("http")
            ? coverImageUrl
            : `${siteUrl}${coverImageUrl}`,
        ]
      : [];

    const session = await stripe.checkout.sessions.create({
      automatic_payment_methods: { enabled: true },
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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const trackId = session.metadata?.trackId || undefined;
      const albumId = session.metadata?.albumId || undefined;
      const format = (session.metadata?.format as "mp3" | "wav") || "mp3";
      const email =
        session.customer_details?.email ?? session.customer_email ?? "";
      const amountPaid = (session.amount_total ?? 0) / 100;

      await ctx.runMutation(api.purchases.create, {
        trackId: trackId ? (trackId as never) : undefined,
        albumId: albumId ? (albumId as never) : undefined,
        format,
        email,
        amountPaid,
        stripePaymentId: session.id,
      });
    }

    return "OK";
  },
});
