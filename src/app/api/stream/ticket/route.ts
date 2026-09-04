import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { hashToken, readSessionToken, serverSecret } from "../../../../lib/session";
import { issueTicket } from "../../../../lib/playback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Exchanges a signed-in session for a short-lived playback URL.
 *
 * The subscription is verified here, once, rather than trusting the ticket
 * itself to carry entitlement — so revoking a subscription stops new tickets
 * immediately, and any outstanding one dies within the hour.
 */
export async function GET(request: Request) {
  const secret = serverSecret();
  if (!secret) {
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }

  const trackId = new URL(request.url).searchParams.get("track");
  if (!trackId) {
    return Response.json({ ok: false, reason: "missing_track" }, { status: 400 });
  }

  const sessionToken = readSessionToken(request);
  if (!sessionToken) {
    return Response.json({ ok: false, reason: "signin" }, { status: 401 });
  }

  try {
    const me = await convex.query(api.auth.me, {
      sessionHash: hashToken(sessionToken),
    });
    if (!me.signedIn) {
      return Response.json({ ok: false, reason: "signin" }, { status: 401 });
    }
    if (!me.subscribed) {
      return Response.json({ ok: false, reason: "subscribe" }, { status: 402 });
    }

    return Response.json({
      ok: true,
      url: `/api/stream?track=${encodeURIComponent(trackId)}&ticket=${issueTicket(
        trackId,
        secret
      )}`,
      expiresInSeconds: 3600,
    });
  } catch (err) {
    console.error("Ticket issue failed:", err);
    return Response.json({ ok: false, reason: "failed" }, { status: 500 });
  }
}
