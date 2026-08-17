import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const trackId = session.metadata?.trackId || undefined;
    const albumId = session.metadata?.albumId || undefined;
    const format = (session.metadata?.format as "mp3" | "wav") || "mp3";
    const email =
      session.customer_details?.email ?? session.customer_email ?? "";
    const amountPaid = (session.amount_total ?? 0) / 100;

    try {
      await convex.mutation(api.purchases.create, {
        trackId: trackId ? (trackId as never) : undefined,
        albumId: albumId ? (albumId as never) : undefined,
        format,
        email,
        amountPaid,
        stripePaymentId:
          (session.payment_intent as string) ?? session.id,
      });
    } catch (err) {
      console.error("Failed to record purchase:", err);
      return new Response("Failed to record purchase", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
