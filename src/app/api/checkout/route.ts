import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return Response.json(
      { error: "Stripe is not configured. Please set up your Stripe account." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeKey);
  const body = await request.json();
  const { trackId, albumId, format } = body;

  if (!trackId && !albumId) {
    return Response.json({ error: "Missing track or album" }, { status: 400 });
  }

  if (!format || !["mp3", "wav"].includes(format)) {
    return Response.json({ error: "Invalid format" }, { status: 400 });
  }

  let name: string;
  let price: number;
  let coverImageUrl: string | null = null;

  try {
    if (trackId) {
      const track = await convex.query(api.tracks.getById, { trackId });
      if (!track) return Response.json({ error: "Track not found" }, { status: 404 });
      name = track.title;
      price = format === "wav" ? track.priceWav : track.priceMp3;
      coverImageUrl = track.coverImageUrl;
    } else {
      const album = await convex.query(api.albums.getById, { albumId });
      if (!album) return Response.json({ error: "Album not found" }, { status: 404 });
      name = album.title;
      price = format === "wav" ? album.priceWav : album.priceMp3;
      coverImageUrl = album.coverImageUrl;
    }
  } catch {
    return Response.json({ error: "Failed to fetch product" }, { status: 500 });
  }

  const siteUrl = process.env.SITE_URL ?? "https://frostlevelz.com";

  const images = coverImageUrl
    ? [coverImageUrl.startsWith("http") ? coverImageUrl : `${siteUrl}${coverImageUrl}`]
    : [];

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${name} (${format.toUpperCase()})`,
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
        trackId: trackId ?? "",
        albumId: albumId ?? "",
        format,
      },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return Response.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
