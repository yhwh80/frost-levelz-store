import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { hashToken, readSessionToken, serverSecret } from "../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Opens Stripe's billing portal, where people can cancel or update their card.
 *
 * Cancelling must be as easy as subscribing, so this is reachable from the
 * account page in one click rather than requiring an email to support.
 */
export async function POST(request: Request) {
  const secret = serverSecret();
  if (!secret) {
    return Response.json({ ok: false, reason: "Unavailable." }, { status: 503 });
  }

  const sessionToken = readSessionToken(request);
  if (!sessionToken) {
    return Response.json({ ok: false, reason: "Please sign in." }, { status: 401 });
  }

  try {
    const customerId = await convex.action(api.auth.stripeCustomerForSession, {
      secret,
      sessionHash: hashToken(sessionToken),
    });

    if (!customerId) {
      return Response.json({
        ok: false,
        reason:
          "No billing account found. If you've just subscribed, give it a moment and try again.",
      });
    }

    const url = await convex.action(api.stripe.createPortalSession, {
      secret,
      stripeCustomerId: customerId,
    });
    if (!url) return Response.json({ ok: false, reason: "Portal unavailable." });

    return Response.json({ ok: true, url });
  } catch (err) {
    console.error("Portal session failed:", err);
    return Response.json({ ok: false, reason: "Something went wrong." }, { status: 500 });
  }
}
