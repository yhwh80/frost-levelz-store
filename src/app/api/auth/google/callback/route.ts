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

function fail(reason: string, detail?: string) {
  // Logged so the server tells us which step failed — several of these happen
  // before Convex is called, so they leave no trace in the Convex logs.
  console.error(`[google-auth] failed: ${reason}${detail ? ` — ${detail}` : ""}`);
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
  console.error("[google-auth] callback reached");
  const secret = serverSecret();
  if (!secret) return fail("google_unavailable");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readCookie(request, STATE_COOKIE);

  const googleError = url.searchParams.get("error");
  if (googleError) return fail("cancelled", `google said: ${googleError}`);
  if (!code || !state) return fail("missing_code", `code=${!!code} state=${!!state}`);
  // Reject if the state doesn't match the cookie this browser was given.
  if (!expectedState || state !== expectedState)
    return fail("bad_state", expectedState ? "state mismatch" : "state cookie missing");

  try {
    // The client secret never reaches this server — Convex does the exchange
    // and hands back only the verified email address.
    const exchanged = await convex.action(api.auth.exchangeGoogleCode, {
      secret,
      code,
      redirectUri: `${SITE}/api/auth/google/callback`,
    });
    if (!exchanged.ok || !exchanged.email) {
      return fail(exchanged.reason ?? "google_failed", "convex exchange rejected");
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
