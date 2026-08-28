import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { hashToken, newToken, serverSecret } from "../../../../lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const SITE = process.env.SITE_URL ?? "https://frostlevelz.com";

export async function POST(request: Request) {
  const secret = serverSecret();
  if (!secret) {
    return Response.json({ ok: false, reason: "Sign-in unavailable." }, { status: 503 });
  }

  let email = "";
  try {
    email = String((await request.json()).email ?? "");
  } catch {
    return Response.json({ ok: false, reason: "Bad request." }, { status: 400 });
  }

  // The plain token only exists here and in the email; the database stores a hash.
  const token = newToken();

  try {
    const result = await convex.action(api.auth.requestLogin, {
      secret,
      email,
      tokenHash: hashToken(token),
    });

    if (!result.ok) {
      return Response.json({ ok: false, reason: result.reason });
    }

    const url = `${SITE}/api/auth/callback?token=${encodeURIComponent(token)}`;
    const sent = await convex.action(api.auth.deliverLoginLink, {
      secret,
      email: result.email!,
      url,
    });

    if (!sent) {
      return Response.json({
        ok: false,
        reason: "Couldn't send the email just now — try again shortly.",
      });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Login request failed:", err);
    return Response.json({ ok: false, reason: "Something went wrong." }, { status: 500 });
  }
}
