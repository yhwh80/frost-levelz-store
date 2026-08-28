import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import {
  hashToken,
  newToken,
  serverSecret,
  sessionCookieHeader,
} from "../../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const SITE = process.env.SITE_URL ?? "https://frostlevelz.com";
const STATE_COOKIE = "fl_oauth_state";

function fail(reason: string) {
  return Response.redirect(`${SITE}/account?error=${encodeURIComponent(reason)}`, 303);
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

export async function GET(request: Request) {
  const secret = serverSecret();
  if (!secret) return fail("google_unavailable");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readCookie(request, STATE_COOKIE);

  if (url.searchParams.get("error")) return fail("cancelled");
  if (!code || !state) return fail("missing_code");
  // Reject if the state doesn't match the cookie this browser was given.
  if (!expectedState || state !== expectedState) return fail("bad_state");

  try {
    // The client secret never reaches this server — Convex does the exchange
    // and hands back only the verified email address.
    const exchanged = await convex.action(api.auth.exchangeGoogleCode, {
      secret,
      code,
      redirectUri: `${SITE}/api/auth/google/callback`,
    });
    if (!exchanged.ok || !exchanged.email) {
      return fail(exchanged.reason ?? "google_failed");
    }

    const sessionToken = newToken();
    const result = await convex.action(api.auth.signInWithProvider, {
      secret,
      email: exchanged.email,
      sessionHash: hashToken(sessionToken),
    });
    if (!result.ok) return fail("signin_failed");

    return new Response(null, {
      status: 303,
      headers: {
        Location: `${SITE}/account`,
        "Set-Cookie": sessionCookieHeader(sessionToken),
      },
    });
  } catch (err) {
    console.error("Google sign-in failed:", err);
    return fail("google_failed");
  }
}
