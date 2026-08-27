import { ConvexHttpClient } from "convex/browser";
import { createHash } from "node:crypto";
import { api } from "../../../../convex/_generated/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Comments are posted through here rather than straight from the browser so
 * the visitor's IP can be hashed server-side for rate limiting. The raw IP is
 * never stored — only a salted hash, which is enough to spot repeat posters
 * without keeping personal data.
 */
function hashIp(request: Request, secret: string): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  if (!ip) return undefined;
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex").slice(0, 32);
}

export async function POST(request: Request) {
  const secret = process.env.DOWNLOAD_SERVER_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, reason: "Comments are unavailable right now." },
      { status: 503 }
    );
  }

  let payload: { name?: string; body?: string; website?: string; fillMs?: number };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, reason: "Bad request." }, { status: 400 });
  }

  const name = String(payload.name ?? "").slice(0, 100);
  const body = String(payload.body ?? "").slice(0, 2000);
  const website = String(payload.website ?? "").slice(0, 100);
  const fillMs = Number(payload.fillMs ?? 0);

  try {
    const result = await convex.action(api.comments.submit, {
      secret,
      name,
      body,
      website,
      fillMs: Number.isFinite(fillMs) ? fillMs : 0,
      ipHash: hashIp(request, secret),
    });
    return Response.json(result);
  } catch (err) {
    console.error("Comment submit failed:", err);
    return Response.json(
      { ok: false, reason: "Couldn't post that — try again shortly." },
      { status: 500 }
    );
  }
}
