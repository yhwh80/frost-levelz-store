import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived signed playback tickets.
 *
 * An <audio> element (and a native AVPlayer later) can only be handed a URL —
 * it can't attach an Authorization header. Rather than putting the session
 * token in the query string, where it would live in logs and history and be
 * valid for 90 days, the app exchanges its session for a ticket that is:
 *
 *   - bound to one track
 *   - valid for one hour
 *   - signed, so it can't be forged or extended
 *
 * The subscription is checked when the ticket is issued. A leaked URL therefore
 * exposes a single track for at most an hour, rather than an account.
 */
const TICKET_TTL_MS = 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function issueTicket(trackId: string, secret: string): string {
  const expires = Date.now() + TICKET_TTL_MS;
  const payload = `${trackId}.${expires}`;
  return `${expires}.${sign(payload, secret)}`;
}

export function verifyTicket(
  ticket: string,
  trackId: string,
  secret: string
): boolean {
  const [expiresRaw, signature] = ticket.split(".");
  if (!expiresRaw || !signature) return false;

  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  const expected = sign(`${trackId}.${expires}`, secret);

  // Constant-time compare so the signature can't be guessed byte by byte.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
