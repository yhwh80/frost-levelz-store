import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import {
  clearCookieHeader,
  hashToken,
  readSessionToken,
  serverSecret,
} from "../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Who am I? The browser never sees the session hash — it holds an httpOnly
 * cookie and asks this route, which does the lookup server-side.
 */
export async function GET(request: Request) {
  const token = readSessionToken(request);
  if (!token) return Response.json({ signedIn: false });

  try {
    const me = await convex.query(api.auth.me, { sessionHash: hashToken(token) });
    return Response.json(me);
  } catch {
    return Response.json({ signedIn: false });
  }
}

/** Sign out: drop the session server-side and clear the cookie. */
export async function DELETE(request: Request) {
  const token = readSessionToken(request);
  const secret = serverSecret();

  if (token && secret) {
    try {
      await convex.action(api.auth.endSession, {
        secret,
        sessionHash: hashToken(token),
      });
    } catch {
      // Even if the server-side delete fails, clear the cookie.
    }
  }

  return new Response(JSON.stringify({ signedIn: false }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearCookieHeader(),
    },
  });
}
