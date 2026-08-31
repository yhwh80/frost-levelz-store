import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { hashToken, newToken, serverSecret } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Exchanges a one-time magic-link token for a session token, returned as JSON
 * rather than set as a cookie.
 *
 * This is how a native app signs in: it can't rely on cookies, so it takes the
 * token from the sign-in link and holds the resulting session itself. The web
 * flow at /api/auth/callback is unchanged and still uses a cookie.
 *
 * Safe to expose because it consumes the same single-use, 15-minute login
 * token: without a valid one it returns nothing, and using one burns it.
 */
export async function POST(request: Request) {
  const secret = serverSecret();
  if (!secret) {
    return Response.json({ ok: false, reason: "unavailable" }, { status: 503 });
  }

  let loginToken = "";
  try {
    loginToken = String((await request.json()).token ?? "");
  } catch {
    return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  if (!loginToken) {
    return Response.json({ ok: false, reason: "missing_token" }, { status: 400 });
  }

  // Generated here so the plain value is returned exactly once, to the caller,
  // and only its hash is ever stored.
  const sessionToken = newToken();

  try {
    const result = await convex.action(api.auth.completeLogin, {
      secret,
      tokenHash: hashToken(loginToken),
      sessionHash: hashToken(sessionToken),
    });

    if (!result.ok) {
      return Response.json(
        { ok: false, reason: result.reason ?? "invalid" },
        { status: 401 }
      );
    }

    return Response.json({
      ok: true,
      sessionToken,
      email: result.email,
      // Matches the cookie lifetime so the app can refresh at the same point.
      expiresInSeconds: 90 * 24 * 60 * 60,
    });
  } catch (err) {
    console.error("App session exchange failed:", err);
    return Response.json({ ok: false, reason: "failed" }, { status: 500 });
  }
}
