import { newToken } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE = process.env.SITE_URL ?? "https://frostlevelz.com";
export const STATE_COOKIE = "fl_oauth_state";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Response.redirect(`${SITE}/account?error=google_unavailable`, 303);
  }

  // CSRF protection: a random value echoed back by Google and compared against
  // a cookie only this browser has. Without it, an attacker could hand someone
  // a callback URL and sign them into the attacker's account.
  const state = newToken();

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${SITE}/api/auth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return new Response(null, {
    status: 303,
    headers: {
      Location: url.toString(),
      "Set-Cookie": `${STATE_COOKIE}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
