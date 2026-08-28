import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { hashToken, readSessionCookie, serverSecret } from "../../../lib/session";
import type { Id } from "../../../../convex/_generated/dataModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Serves a full track to an active subscriber.
 *
 * The audio is proxied rather than redirected: a redirect would hand the
 * browser the underlying Convex storage URL, which is permanent and
 * unauthenticated, and could then be shared freely. Proxying means the only
 * address that ever reaches the page is this one, which re-checks the
 * subscription on every single request.
 *
 * Range requests are passed through so seeking and scrubbing work — without
 * that, players can't jump around and some browsers refuse to play at all.
 */
export async function GET(request: Request) {
  const secret = serverSecret();
  if (!secret) return new Response("Unavailable", { status: 503 });

  const trackId = new URL(request.url).searchParams.get("track");
  if (!trackId) return new Response("Missing track", { status: 400 });

  const sessionToken = readSessionCookie(request);
  if (!sessionToken) return new Response("Sign in to listen", { status: 401 });

  let me;
  try {
    me = await convex.query(api.auth.me, { sessionHash: hashToken(sessionToken) });
  } catch {
    return new Response("Sign in to listen", { status: 401 });
  }

  if (!me.signedIn) return new Response("Sign in to listen", { status: 401 });
  if (!me.subscribed) {
    return new Response("Subscribe to hear full tracks", { status: 402 });
  }

  let source: { url: string; title: string } | null;
  try {
    source = await convex.action(api.files.streamForSubscriber, {
      secret,
      trackId: trackId as Id<"tracks">,
    });
  } catch {
    return new Response("Track unavailable", { status: 404 });
  }
  if (!source) return new Response("Track unavailable", { status: 404 });

  // Forward the browser's Range header so seeking works.
  const range = request.headers.get("range");
  const upstream = await fetch(source.url, {
    headers: range ? { Range: range } : undefined,
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response("Could not load track", { status: 502 });
  }

  const headers = new Headers({
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    // Private and no-store: a shared cache must never hold subscriber audio.
    "Cache-Control": "private, no-store",
    // Discourage the browser's own "save as" affordances.
    "Content-Disposition": "inline",
  });
  for (const h of ["content-length", "content-range"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
