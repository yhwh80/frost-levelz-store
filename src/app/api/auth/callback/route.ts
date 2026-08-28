import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import {
  hashToken,
  newToken,
  serverSecret,
  sessionCookieHeader,
} from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const SITE = process.env.SITE_URL ?? "https://frostlevelz.com";

function back(reason: string) {
  return Response.redirect(`${SITE}/account?error=${encodeURIComponent(reason)}`, 303);
}

export async function GET(request: Request) {
  const secret = serverSecret();
  if (!secret) return back("unavailable");

  const token = new URL(request.url).searchParams.get("token");
  if (!token) return back("missing");

  // A fresh session token, distinct from the login token — the emailed link is
  // single-use and must not double as the long-lived credential. Generated here
  // so the plain value only ever lives in the cookie we're about to set.
  const sessionToken = newToken();

  try {
    const result = await convex.action(api.auth.completeLogin, {
      secret,
      tokenHash: hashToken(token),
      sessionHash: hashToken(sessionToken),
    });

    if (!result.ok) return back(result.reason ?? "invalid");

    return new Response(null, {
      status: 303,
      headers: {
        Location: `${SITE}/account`,
        "Set-Cookie": sessionCookieHeader(sessionToken),
      },
    });
  } catch (err) {
    console.error("Login callback failed:", err);
    return back("failed");
  }
}
