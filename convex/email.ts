"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const FROM = process.env.EMAIL_FROM ?? "Frost Levelz <music@frostlevelz.com>";
const REPLY_TO = "Frostlevelmanagement@gmail.com";
const SITE = process.env.SITE_URL ?? "https://frostlevelz.com";

const ACCENT = "#89CFF0";
const BG = "#0a0a0f";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends via Resend's HTTP API. Returns false rather than throwing when the key
 * is missing, so the site works normally before email is configured and a mail
 * outage can never fail a purchase webhook.
 */
async function send(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping email:", opts.subject);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.replyTo ?? REPLY_TO,
      }),
    });

    if (!res.ok) {
      console.error("Resend rejected the send:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend request failed:", err);
    return false;
  }
}

function shell(title: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#12121a;border:1px solid #23232e;border-radius:14px;padding:32px;font-family:Helvetica,Arial,sans-serif;color:#e9e9f0;">
<tr><td>
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${ACCENT};font-weight:bold;">Frost Levelz</div>
<h1 style="margin:14px 0 18px;font-size:21px;line-height:1.3;color:#ffffff;">${title}</h1>
${inner}
</td></tr></table>
<div style="max-width:520px;margin-top:18px;font-size:11px;color:#6b6b7b;font-family:Helvetica,Arial,sans-serif;">
Frost Level Investment Group &middot; <a href="${SITE}" style="color:${ACCENT};text-decoration:none;">frostlevelz.com</a>
</div>
</td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr><td style="background:${ACCENT};border-radius:999px;">
<a href="${href}" style="display:inline-block;padding:13px 30px;font-weight:bold;font-size:15px;color:${BG};text-decoration:none;">${label}</a>
</td></tr></table>`;
}

/**
 * Purchase confirmation. Called from the Stripe webhook; the caller marks the
 * purchase as emailed so a webhook retry can't send it twice.
 */
export const sendPurchaseConfirmation = internalAction({
  args: {
    to: v.string(),
    title: v.string(),
    format: v.string(),
    kind: v.union(v.literal("track"), v.literal("album")),
    stripeSessionId: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<boolean> => {
    if (!args.to) return false;

    const link = `${SITE}/success?session_id=${encodeURIComponent(args.stripeSessionId)}`;
    const expiry = args.expiresAt
      ? new Date(args.expiresAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

    const inner = `
<p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#c9c9d6;">Thank you for buying direct — it goes straight to the artist.</p>
<p style="margin:16px 0 0;font-size:17px;color:#ffffff;font-weight:bold;">${escapeHtml(args.title)}</p>
<p style="margin:4px 0 0;font-size:13px;color:#8a8a9c;">${args.kind === "album" ? "Album" : "Single"} &middot; ${escapeHtml(args.format.toUpperCase())}${args.kind === "album" ? " &middot; delivered as a zip" : ""}</p>
${button(link, "Download your music")}
<p style="margin:0;font-size:13px;line-height:1.6;color:#8a8a9c;">
Keep this email — it's your download link. You can use it up to 5 times${expiry ? `, until <strong style="color:#c9c9d6;">${expiry}</strong>` : ""}.
</p>
<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#8a8a9c;">
Trouble downloading? Just reply to this email.
</p>`;

    return await send({
      to: args.to,
      subject: `Your download: ${args.title}`,
      html: shell("Your music is ready", inner),
    });
  },
});

/** Notifies Frost when a fan leaves a comment, so nothing sits unseen. */
export const notifyNewComment = internalAction({
  args: { name: v.string(), body: v.string(), pending: v.boolean() },
  handler: async (ctx, args): Promise<boolean> => {
    const inner = `
<p style="margin:0 0 14px;font-size:15px;color:#c9c9d6;">
${args.pending ? "A comment is waiting for approval." : "A new comment is live on the site."}
</p>
<div style="background:#0f0f16;border-left:3px solid ${ACCENT};border-radius:6px;padding:14px 16px;">
<p style="margin:0 0 6px;font-size:13px;color:${ACCENT};font-weight:bold;">${escapeHtml(args.name)}</p>
<p style="margin:0;font-size:14px;line-height:1.6;color:#d7d7e2;white-space:pre-wrap;">${escapeHtml(args.body)}</p>
</div>
${button(`${SITE}/#comments`, "View on the site")}`;

    return await send({
      to: REPLY_TO,
      subject: `New comment from ${args.name}`,
      html: shell("New comment", inner),
    });
  },
});

/**
 * Lets you confirm the Resend setup end to end without waiting for a real sale.
 *   npx convex run --prod email:sendTest '{"to":"you@example.com"}'
 */
export const sendTest = action({
  args: { to: v.string() },
  handler: async (ctx, args): Promise<string> => {
    if (!process.env.RESEND_API_KEY) {
      return "RESEND_API_KEY is not set — nothing sent.";
    }
    const ok = await send({
      to: args.to,
      subject: "Frost Levelz — test email",
      html: shell(
        "Email is working",
        `<p style="margin:0;font-size:15px;line-height:1.6;color:#c9c9d6;">If you're reading this, Resend is configured correctly and purchase confirmations will go out.</p>`
      ),
    });
    return ok ? `Sent to ${args.to}` : "Send failed — check the Convex logs.";
  },
});
