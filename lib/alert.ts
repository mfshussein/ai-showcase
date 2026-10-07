/** Sending the night shift report from the stage: recipient chosen in the room, content taken from the recorded report. */
type Env = Record<string, string | undefined>;
export type AlertReport = { subject: string; text: string; html: string };
type Send = (m: AlertReport, env: Env) => Promise<{ sent: boolean; reason?: string }>;

/** On the projector the default recipient is never shown: everything but the top-level domain is hidden. */
export function maskAddress(addr: string): string {
  if (!addr) return "";
  const dot = addr.lastIndexOf(".");
  return "*********" + (dot > addr.indexOf("@") ? addr.slice(dot) : "");
}

export function isEmail(s: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(s);
}

export function baseUrl(env: Env): string {
  if (env.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** Recordings are made locally; links to a case are re-pointed at wherever the showcase is running now. */
export function rewriteLinks(s: string, base: string): string {
  return s.replace(/https?:\/\/[^/\s"'<>]+(?=\/demo\/)/g, base);
}

export function createRateLimit(max: number, windowMs: number, now: () => number = Date.now) {
  let stamps: number[] = [];
  return () => {
    const t = now();
    stamps = stamps.filter((s) => t - s < windowMs);
    if (stamps.length >= max) return false;
    stamps.push(t);
    return true;
  };
}

export async function handleAlert(o: {
  role: string | undefined; to: string | undefined; report: AlertReport | null; env: Env; send: Send; allow: () => boolean;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  if (o.role !== "presenter") return { status: 403, body: { sent: false, reason: "presenter only" } };
  const typed = o.to?.trim();
  if (typed && !isEmail(typed)) return { status: 400, body: { sent: false, reason: "invalid address" } };
  if (!o.report) return { status: 404, body: { sent: false, reason: "no recorded report" } };
  if (!o.allow()) return { status: 429, body: { sent: false, reason: "too many sends, try again in a few minutes" } };
  const to = typed || o.env.ALERT_EMAIL_TO || "";
  const shown = typed ? typed : maskAddress(to);
  const base = baseUrl(o.env);
  const r = await o.send({ subject: o.report.subject, text: rewriteLinks(o.report.text, base), html: rewriteLinks(o.report.html, base) }, { ...o.env, ALERT_EMAIL_TO: to });
  return { status: 200, body: r.sent ? { sent: true, to: shown } : { sent: false, reason: r.reason, to: shown } };
}
