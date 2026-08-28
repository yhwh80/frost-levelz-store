import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "fl_session";
export const SESSION_MAX_AGE = 90 * 24 * 60 * 60; // seconds

/**
 * Tokens are random and only ever stored as a hash, so a leak of the database
 * can't be replayed into a session. The plain value lives in the user's cookie
 * or their emailed link and nowhere else.
 */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function serverSecret(): string | undefined {
  return process.env.DOWNLOAD_SERVER_SECRET;
}

export function readSessionCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === SESSION_COOKIE) return rest.join("=");
  }
  return undefined;
}

export function sessionCookieHeader(token: string): string {
  // httpOnly so scripts can't read it; sameSite=lax so it survives the click
  // through from the emailed magic link.
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE}`,
  ].join("; ");
}

export function clearCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
