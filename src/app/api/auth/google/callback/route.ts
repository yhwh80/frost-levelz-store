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
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret || !clientId || !clientSecret) return fail("google_unavailable");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readCookie(request, STATE_COOKIE);

  if (url.searchParams.get("error")) return fail("cancelled");
  if (!code || !state) return fail("missing_code");
  // Reject if the state doesn't match the cookie this browser was given.
  if (!expectedState || state !== expectedState) return fail("bad_state");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${SITE}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail("token_exchange_failed");
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) return fail("no_access_token");

    // Fetched directly from Google over TLS, so the response is trustworthy
    // without separately verifying a JWT signature.
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) return fail("userinfo_failed");
    const info = (await infoRes.json()) as { email?: string; email_verified?: boolean };

    // An unverified Google address proves nothing about who owns it.
    if (!info.email || info.email_verified === false) return fail("unverified_email");

    const sessionToken = newToken();
    const result = await convex.action(api.auth.signInWithProvider, {
      secret,
      email: info.email,
      sessionHash: hashToken(sessionToken),
    });
    if (!result.ok) return fail("signin_failed");

    return new Response(null, {
      status: 303,
      headers: {
        Location: `${SITE}/account`,
        // Set the session and clear the one-time state cookie together.
        "Set-Cookie": sessionCookieHeader(sessionToken),
      },
    });
  } catch (err) {
    console.error("Google sign-in failed:", err);
    return fail("google_failed");
  }
}
