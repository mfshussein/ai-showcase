/** Sends the alert email over SMTP. Server-only. Credentials come from env and are never logged or returned. */
import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

type Env = Record<string, string | undefined>;
type MakeTransport = (o: SMTPTransport.Options) => Transporter;

export async function sendAlertEmail(
  msg: { subject: string; html: string; text: string },
  env: Env = process.env,
  makeTransport: MakeTransport = (o) => nodemailer.createTransport(o),
): Promise<{ sent: boolean; id?: string; reason?: string; raw?: string }> {
  if (!env.SMTP_HOST) return { sent: false, reason: "SMTP_HOST not set" };
  if (!env.ALERT_EMAIL_TO) return { sent: false, reason: "ALERT_EMAIL_TO not set" };
  const port = Number(env.SMTP_PORT ?? 465);
  const secrets = [env.SMTP_PASS, env.SMTP_USER].filter((s): s is string => !!s && s.length > 2);
  const scrub = (s: string) => secrets.reduce((acc, x) => acc.split(x).join("***"), s);
  try {
    const transport = makeTransport({ host: env.SMTP_HOST, port, secure: port === 465, auth: { user: env.SMTP_USER ?? "", pass: env.SMTP_PASS ?? "" } });
    const info = (await transport.sendMail({ from: env.SMTP_FROM ?? env.SMTP_USER, to: env.ALERT_EMAIL_TO, subject: msg.subject, text: msg.text, html: msg.html })) as { messageId?: string; message?: unknown };
    return { sent: true, id: info.messageId, ...(typeof info.message === "string" ? { raw: info.message } : {}) };
  } catch (e) {
    return { sent: false, reason: scrub(`smtp error: ${e instanceof Error ? e.message : String(e)}`).slice(0, 200) };
  }
}
