import { getSession } from "@/lib/session";
import { goldens } from "@/demos/goldens";
import { parseGolden } from "@/lib/events";
import { sendAlertEmail } from "@/lib/mail";
import { sendWebhook } from "@/lib/notify";
import { createRateLimit, handleAlert, maskAddress, type AlertReport } from "@/lib/alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** At most 5 sends per 10 minutes per server instance. Presenter-only, so this is a backstop, not the gate. */
const allow = createRateLimit(5, 10 * 60_000);

/** The report comes from the recording, never from the browser: the browser only chooses the recipient. */
function recordedReport(): AlertReport | null {
  const raw = goldens["night-watchman"];
  if (!raw) return null;
  const ev = parseGolden(raw).events.find((e) => e.type === "panel" && e.id === "email");
  if (!ev || ev.type !== "panel") return null;
  const { subject, text, html } = ev.props as Record<string, unknown>;
  return typeof subject === "string" && typeof text === "string" ? { subject, text, html: typeof html === "string" ? html : "" } : null;
}

export async function GET() {
  const session = await getSession();
  return Response.json({ defaultMasked: maskAddress(process.env.ALERT_EMAIL_TO ?? ""), canSend: session?.role === "presenter" });
}

export async function POST(req: Request) {
  const session = await getSession();
  let to: string | undefined;
  try {
    const body = (await req.json()) as { to?: unknown };
    to = typeof body.to === "string" ? body.to.slice(0, 254) : undefined;
  } catch {
    to = undefined;
  }
  const r = await handleAlert({
    role: session?.role, to, report: recordedReport(), env: process.env, allow,
    send: async (m, env) => {
      const mail = await sendAlertEmail(m, env);
      if (env.SLACK_WEBHOOK_URL) await sendWebhook(m.text, env);
      return mail;
    },
  });
  return Response.json(r.body, { status: r.status });
}
