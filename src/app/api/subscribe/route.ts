import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { hashToken, readSessionCookie, serverSecret } from "../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Starts subscription checkout. Requires a signed-in session, so a subscription
 * can never be created detached from an account — which is the whole reason we
 * ask people to sign in first.
 */
export async function POST(request: Request) {
  const secret = serverSecret();
  if (!secret) {
    return Response.json({ ok: false, reason: "Unavailable." }, { status: 503 });
  }

  const sessionToken = readSessionCookie(request);
  if (!sessionToken) {
    return Response.json({ ok: false, reason: "Please sign in first." }, { status: 401 });
  }

  try {
    const me = await convex.query(api.auth.me, {
      sessionHash: hashToken(sessionToken),
    });
    if (!me.signedIn) {
      return Response.json(
        { ok: false, reason: "Your session has expired — sign in again." },
        { status: 401 }
      );
    }
    if (me.subscribed) {
      return Response.json({ ok: false, reason: "You're already subscribed." });
    }

    const url = await convex.action(api.stripe.createSubscriptionCheckout, {
      secret,
      email: me.email!,
    });
    if (!url) return Response.json({ ok: false, reason: "Checkout unavailable." });

    return Response.json({ ok: true, url });
  } catch (err) {
    console.error("Subscribe failed:", err);
    return Response.json({ ok: false, reason: "Something went wrong." }, { status: 500 });
  }
}
