import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";

export const createCheckoutSession = action({
  args: {
    trackId: v.optional(v.id("tracks")),
    albumId: v.optional(v.id("albums")),
    format: v.union(v.literal("mp3"), v.literal("wav")),
  },
  handler: async (ctx, args) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("Stripe is not configured yet");

    const stripe = new Stripe(stripeKey);

    let name: string;
    let price: number;
    let coverImageUrl: string | null = null;

    if (args.trackId) {
      const track = await ctx.runQuery(
        // @ts-expect-error internal query
        "tracks:getById" as never,
        { trackId: args.trackId }
      );
      if (!track) throw new Error("Track not found");
      name = track.title;
      price = args.format === "wav" ? track.priceWav : track.priceMp3;
      coverImageUrl = track.coverImageUrl;
    } else if (args.albumId) {
      const album = await ctx.runQuery(
        // @ts-expect-error internal query
        "albums:getById" as never,
        { albumId: args.albumId }
      );
      if (!album) throw new Error("Album not found");
      name = album.title;
      price = args.format === "wav" ? album.priceWav : album.priceMp3;
      coverImageUrl = album.coverImageUrl;
    } else {
      throw new Error("Must provide trackId or albumId");
    }

    const siteUrl = process.env.SITE_URL ?? "https://frostlevelz.com";

    const images = coverImageUrl
      ? [coverImageUrl.startsWith("http") ? coverImageUrl : `${siteUrl}${coverImageUrl}`]
      : [];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
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
