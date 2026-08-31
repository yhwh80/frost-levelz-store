import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { hashToken, readSessionCookie, serverSecret } from "../../../lib/session";
import type { Id } from "../../../../convex/_generated/dataModel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Moderation endpoints. Access needs both the server secret (held only by this
 * route) and a signed-in session on the admin list — checked inside Convex, so
 * a mistake here can't grant access on its own.
 */
async function sessionHashOrNull(request: Request): Promise<string | null> {
  const token = readSessionCookie(request);
  return token ? hashToken(token) : null;
}

export async function GET(request: Request) {
  const secret = serverSecret();
  const sessionHash = await sessionHashOrNull(request);
  if (!secret || !sessionHash) {
    return Response.json({ ok: false, reason: "not_admin" }, { status: 403 });
  }

  try {
    const data = await convex.action(api.comments.adminOverview, {
      secret,
      sessionHash,
    });
    return Response.json({ ok: true, ...data });
  } catch {
    // Deliberately identical for "not signed in" and "not an admin" — no need
    // to tell an unauthorised visitor which it was.
    return Response.json({ ok: false, reason: "not_admin" }, { status: 403 });
  }
}

export async function POST(request: Request) {
  const secret = serverSecret();
  const sessionHash = await sessionHashOrNull(request);
  if (!secret || !sessionHash) {
    return Response.json({ ok: false, reason: "not_admin" }, { status: 403 });
  }

  let payload: {
    op?: string;
    commentId?: string;
    action?: string;
    key?: string;
    value?: boolean;
  };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  try {
    if (payload.op === "moderate") {
      const result = await convex.action(api.comments.adminModerate, {
        secret,
        sessionHash,
        commentId: payload.commentId as Id<"comments">,
        action: payload.action as "hide" | "show" | "delete",
      });
      return Response.json({ ok: true, result });
    }

    if (payload.op === "setting") {
      const result = await convex.action(api.comments.adminSetSetting, {
        secret,
        sessionHash,
        key: payload.key as "commentsEnabled" | "commentsRequireApproval",
        value: !!payload.value,
      });
      return Response.json({ ok: true, result });
    }

    return Response.json({ ok: false, reason: "unknown_op" }, { status: 400 });
  } catch {
    return Response.json({ ok: false, reason: "not_admin" }, { status: 403 });
  }
}
