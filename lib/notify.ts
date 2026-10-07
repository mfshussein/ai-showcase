/** The night shift report in three shapes (plain text, HTML email, Slack mrkdwn) and a generic webhook sender. */
export type ReportLine = { kind: string; vendor: string; amount: number; en: string; ar: string; action: string };
export type Report = { subject: string; text: string; html: string; slack: string };

/** "Name <local@domain>" or "local@domain" → keep the first character of the local part. Recordings are committed; mailboxes are not. */
export function maskEmail(s: string): string {
  return s.replace(/([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+)/g, "$1•••@$2");
}

export const qar = (n: number) => `QAR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const money = (n: number) => (n ? ` · ${qar(n)}` : "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildReport(lines: ReportLine[], o: { company: string; link: string; date: string }): Report {
  const n = lines.length;
  const subject = `Night shift report: ${n} ${n === 1 ? "item needs" : "items need"} a look (${o.company})`;
  const head = `Night shift report, ${o.date}, ${o.company}\nتقرير الوردية الليلية، ${o.date}`;
  const text = [
    head, "", `${n} ${n === 1 ? "item needs" : "items need"} a look:`, "",
    ...lines.flatMap((l, i) => [`${i + 1}. ${l.kind} · ${l.vendor}${money(l.amount)}`, `   ${l.en}`, `   ${l.ar}`, `   Action: ${l.action}`, ""]),
    `Evidence: ${o.link}`,
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0f1720;max-width:640px">
<h2 style="margin:0 0 4px">${esc(subject)}</h2>
<p style="margin:0 0 16px;color:#5b6472">${esc(o.date)} · <span dir="rtl">تقرير الوردية الليلية</span></p>
${lines.map((l, i) => `<div style="border-top:1px solid #d9dee5;padding:10px 0">
<p style="margin:0"><b>${i + 1}. ${esc(l.kind)}</b> · ${esc(l.vendor)}${l.amount ? ` · <b>${esc(qar(l.amount))}</b>` : ""}</p>
<p style="margin:4px 0">${esc(l.en)}</p>
<p style="margin:4px 0" dir="rtl">${esc(l.ar)}</p>
<p style="margin:4px 0;color:#b45309">Action: ${esc(l.action)}</p>
</div>`).join("\n")}
<p style="margin-top:16px"><a href="${esc(o.link)}">Open the evidence</a></p>
</div>`;
  const slack = [`*${subject}*`, ...lines.map((l, i) => `${i + 1}. *${l.kind}* · ${l.vendor}${money(l.amount)}\n${l.en}\n${l.ar}\n_Action: ${l.action}_`), `<${o.link}|Open the evidence>`].join("\n\n");
  return { subject, text, html, slack };
}

/** Posts { text } to a Slack or Microsoft Teams incoming webhook. Never echoes the URL. */
export async function sendWebhook(text: string, env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): Promise<{ sent: boolean; reason?: string }> {
  const url = env.SLACK_WEBHOOK_URL;
  if (!url) return { sent: false, reason: "SLACK_WEBHOOK_URL not set" };
  try {
    const res = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(8000) });
    return res.ok ? { sent: true } : { sent: false, reason: `webhook ${res.status}` };
  } catch {
    return { sent: false, reason: "webhook unreachable" };
  }
}
