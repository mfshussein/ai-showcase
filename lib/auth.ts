/** Signed session cookie. Web Crypto only, so it runs in proxy.ts, route handlers and tests. */
export type Role = "viewer" | "presenter";
export interface Session { role: Role; exp: number }
export const COOKIE_NAME = "sc_session";
const enc = new TextEncoder();

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Buffer.from(sig).toString("base64url");
}

export async function signSession(s: Session, secret: string): Promise<string> {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifySession(token: string | undefined, secret: string): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;
  const expected = await hmac(payload, secret);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (!s || (s.role !== "viewer" && s.role !== "presenter") || typeof s.exp !== "number" || s.exp < Date.now()) return null;
    return { role: s.role, exp: s.exp };
  } catch {
    return null;
  }
}
