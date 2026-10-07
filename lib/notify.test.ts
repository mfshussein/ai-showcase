import { describe, it, expect } from "vitest";
import nodemailer, { type Transporter } from "nodemailer";
import { buildReport, sendWebhook, type ReportLine } from "./notify";
import { sendAlertEmail } from "./mail";

const lines: ReportLine[] = [
  { kind: "Exact duplicate", vendor: "Al Waab Catering", amount: 48750, en: "Invoice paid twice.", ar: "تم دفع الفاتورة مرتين.", action: "Hold the second payment." },
  { kind: "Outlier", vendor: "Gulf <Steel>", amount: 412000.5, en: "Five times the usual.", ar: "خمسة أضعاف المعتاد.", action: "Call the vendor." },
];
const opts = { company: "Marsa Holdings AP", link: "http://localhost:3000/demo/night-watchman", date: "2026-10-07" };

describe("buildReport", () => {
  it("writes a subject with the count and company", () => {
    expect(buildReport(lines, opts).subject).toBe("Night shift report: 2 items need a look (Marsa Holdings AP)");
    expect(buildReport(lines.slice(0, 1), opts).subject).toBe("Night shift report: 1 item needs a look (Marsa Holdings AP)");
  });
  it("puts one line per flag with QAR amount, vendor, both languages and the action, plus the link", () => {
    const { text } = buildReport(lines, opts);
    expect(text).toContain("Exact duplicate · Al Waab Catering · QAR 48,750.00");
    expect(text).toContain("QAR 412,000.50");
    expect(text).toContain("تم دفع الفاتورة مرتين.");
    expect(text).toContain("Action: Hold the second payment.");
    expect(text).toContain(opts.link);
  });
  it("omits the amount for findings without one, such as a login", () => {
    const { text } = buildReport([{ kind: "Off-hours admin login", vendor: "Access log", amount: 0, en: "e", ar: "a", action: "x" }], opts);
    expect(text).toContain("1. Off-hours admin login · Access log\n");
    expect(text).not.toContain("QAR 0.00");
  });
  it("escapes HTML and marks Arabic lines right-to-left", () => {
    const { html } = buildReport(lines, opts);
    expect(html).toContain("Gulf &lt;Steel&gt;");
    expect(html).not.toContain("<Steel>");
    expect(html).toContain('dir="rtl"');
  });
  it("produces Slack mrkdwn", () => {
    expect(buildReport(lines, opts).slack).toContain("*Exact duplicate*");
  });
});

describe("sendAlertEmail", () => {
  const env = { SMTP_HOST: "smtp.example.com", SMTP_PORT: "465", SMTP_USER: "u", SMTP_PASS: "secret-pass", SMTP_FROM: "Night Watchman <nw@example.com>", ALERT_EMAIL_TO: "cfo@example.com" };
  const msg = { subject: "S", text: "T", html: "<p>H</p>" };
  it("does nothing and says why when SMTP_HOST is not set", async () => {
    expect(await sendAlertEmail(msg, { ...env, SMTP_HOST: "" })).toEqual({ sent: false, reason: "SMTP_HOST not set" });
  });
  it("does nothing when ALERT_EMAIL_TO is not set", async () => {
    expect(await sendAlertEmail(msg, { ...env, ALERT_EMAIL_TO: undefined })).toEqual({ sent: false, reason: "ALERT_EMAIL_TO not set" });
  });
  it("sends from SMTP_FROM to ALERT_EMAIL_TO with subject, text and html", async () => {
    const r = await sendAlertEmail(msg, env, () => nodemailer.createTransport({ jsonTransport: true }));
    expect(r.sent).toBe(true);
    const m = JSON.parse(r.raw!) as { from: { address: string }; to: { address: string }[]; subject: string; text: string; html: string };
    expect(m.from.address).toBe("nw@example.com");
    expect(m.to[0].address).toBe("cfo@example.com");
    expect(m).toMatchObject({ subject: "S", text: "T", html: "<p>H</p>" });
  });
  it("builds the SMTP transport with implicit TLS on 465", async () => {
    let seen: Record<string, unknown> = {};
    await sendAlertEmail(msg, env, (o) => { seen = o as Record<string, unknown>; return nodemailer.createTransport({ jsonTransport: true }); });
    expect(seen).toMatchObject({ host: "smtp.example.com", port: 465, secure: true, auth: { user: "u", pass: "secret-pass" } });
  });
  it("reports a failure without leaking the password", async () => {
    const failing = () => ({ sendMail: async () => { throw new Error("auth failed for u with secret-pass"); } }) as unknown as Transporter;
    const r = await sendAlertEmail(msg, env, failing);
    expect(r.sent).toBe(false);
    expect(r.reason).toContain("auth failed");
    expect(r.reason).not.toContain("secret-pass");
  });
});

describe("sendWebhook", () => {
  it("does nothing without a URL", async () => {
    expect(await sendWebhook("hi", {})).toEqual({ sent: false, reason: "SLACK_WEBHOOK_URL not set" });
  });
  it("posts { text } as JSON and reports status without the URL", async () => {
    const calls: { url: string; body: string }[] = [];
    const ok = (async (url: string, init: RequestInit) => { calls.push({ url, body: String(init.body) }); return new Response("ok"); }) as unknown as typeof fetch;
    expect(await sendWebhook("hi", { SLACK_WEBHOOK_URL: "https://hooks.example/T/abc" }, ok)).toEqual({ sent: true });
    expect(JSON.parse(calls[0].body)).toEqual({ text: "hi" });
    const bad = (async () => new Response("no", { status: 403 })) as unknown as typeof fetch;
    const r = await sendWebhook("hi", { SLACK_WEBHOOK_URL: "https://hooks.example/T/abc" }, bad);
    expect(r).toEqual({ sent: false, reason: "webhook 403" });
  });
});
