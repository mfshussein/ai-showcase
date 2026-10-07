import type { DemoRunner } from "../types";
import { generateLedger } from "@/lib/harness/ledger";
import { detectAnomalies } from "@/lib/harness/anomalies";
import { buildReport, sendWebhook, qar, type ReportLine } from "@/lib/notify";
import { sendAlertEmail } from "@/lib/mail";
import { COMPANY, KIND_LABEL, LEDGER_SEED, Notes, maskEmail, qatarTime } from "./shared";

type Night = { date: string; state: "quiet" | "alert" | "running" | "pending"; count?: number; note?: string };
const TONIGHT = "2026-10-07";

export const run: DemoRunner = async function* (ctx) {
  const env = ctx.env ?? process.env;
  const history = JSON.parse(await ctx.fixture("nights.json")) as Night[];
  const { payments, logins } = generateLedger(LEDGER_SEED);
  const nights = (tonight: Night) => [...history.map((n) => ({ date: n.date, state: n.state, count: n.count })), tonight];

  yield { type: "run.start", demo: "night-watchman", mode: "live", runId: crypto.randomUUID() };

  yield { type: "act.start", act: 1, title: "The claim" };
  yield {
    type: "panel", id: "claim", kind: "markdown",
    props: {
      size: "display",
      title: "It works the night shift.",
      text: "Every night it reads every payment and every login, checks them against your rules and against their own history, and stays silent unless something is wrong. When something is, the report is in your inbox before anyone is at their desk.",
    },
  };
  yield { type: "pause" };

  yield { type: "act.start", act: 2, title: "Fourteen nights", subtitle: "Marsa Holdings, a fictional group. Eleven quiet nights, three with something worth a look." };
  yield { type: "panel", id: "timeline", kind: "timeline", props: { title: "The last fourteen nights", nights: nights({ date: TONIGHT, state: "pending" }) } };
  const total = payments.reduce((s, p) => s + p.amount, 0);
  yield {
    type: "panel", id: "scope", kind: "table", slot: "left",
    props: {
      title: "What it reads",
      columns: [{ key: "k", label: "Source" }, { key: "v", label: "Tonight" }],
      rows: [
        { k: "Accounts payable ledger", v: `${payments.length} payments, ${qar(total)}` },
        { k: "Vendors", v: String(new Set(payments.map((p) => p.vendor)).size) },
        { k: "Access log", v: `${logins.length} logins` },
      ],
    },
  };
  yield {
    type: "panel", id: "rules", kind: "table", slot: "right",
    props: {
      title: "What it checks, in plain code",
      columns: [{ key: "rule", label: "Rule" }],
      rows: [
        { rule: "Same invoice paid twice" },
        { rule: "Same vendor and amount, a few days apart" },
        { rule: "Invoices split to stay under the QAR 50,000 approval limit" },
        { rule: "Amounts far outside the vendor's own history" },
        { rule: "Admin logins at night or at the weekend" },
      ],
    },
  };
  yield { type: "pause", label: "Run tonight's shift" };

  yield { type: "act.start", act: 4, title: "Tonight's shift", subtitle: "Statistics find. The model explains. Nobody had to be awake.", keep: ["timeline"] };
  yield { type: "panel.patch", id: "timeline", patch: { nights: nights({ date: TONIGHT, state: "running" }) } };
  const flags = detectAnomalies(payments, logins);
  const rows: Record<string, unknown>[] = [];
  yield { type: "panel", id: "flags", kind: "table", props: { title: `Checking ${payments.length} payments and ${logins.length} logins`, columns: [{ key: "kind", label: "Finding" }, { key: "vendor", label: "Where" }, { key: "amount", label: "Amount" }, { key: "detail", label: "Detail" }], rows: [] } };
  let ce = 9001;
  for (const f of flags) {
    rows.push({ kind: { text: KIND_LABEL[f.kind].toUpperCase(), tone: f.kind === "off-hours-login" ? "quarantine" : "block" }, vendor: f.vendor || "Access log", amount: f.amount ? qar(f.amount) : "", detail: f.detail });
    yield { type: "panel.patch", id: "flags", patch: { title: `${rows.length} finding${rows.length > 1 ? "s" : ""} in ${payments.length} payments and ${logins.length} logins`, rows: rows.map((r) => ({ ...r })) } };
    yield { type: "control.event", detector: `anomaly.${f.kind}`, policyId: "FIN-07", action: "flag", recordId: `CE-${ce++}`, detail: `${f.ids.join(", ")}: ${f.detail}` };
  }

  const items = flags.map((f, i) => ({ id: `F${i + 1}`, kind: KIND_LABEL[f.kind], vendor: f.vendor || "Access log", amount: f.amount, detail: f.detail }));
  const { notes } = await ctx.llm.parse({
    model: "main", effort: "low", maxTokens: 2500, schema: Notes,
    system: "You write the night shift report for the finance controller of a Qatari company. For each finding, write: en, one plain-English sentence on what happened and why it matters; ar, the same in clear Modern Standard Arabic; action, one short imperative sentence saying what to do this morning. Use the figures given; do not invent any. No emoji.",
    prompt: `Findings:\n${JSON.stringify(items)}\n\nReturn notes in the same order, one per finding, with the same id.`,
  });
  const byId = new Map(notes.map((n) => [n.id, n]));
  const lines: ReportLine[] = items.map((it) => {
    const n = byId.get(it.id);
    return { kind: it.kind, vendor: it.vendor, amount: it.amount, en: n?.en ?? it.detail, ar: n?.ar ?? "", action: n?.action ?? "Review this item." };
  });
  yield { type: "panel.patch", id: "timeline", patch: { nights: nights({ date: TONIGHT, state: "alert", count: flags.length }) } };

  const report = buildReport(lines, { company: COMPANY, link: `${env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/demo/night-watchman`, date: TONIGHT });
  const mail = await sendAlertEmail({ subject: report.subject, text: report.text, html: report.html }, env);
  yield { type: "control.event", detector: "alert.email", policyId: "FIN-08", action: mail.sent ? "sent" : "skipped", recordId: `CE-${ce++}`, detail: mail.sent ? `Email sent${mail.id ? `, message ${mail.id}` : ""}` : `Email not sent: ${mail.reason}` };
  if (env.SLACK_WEBHOOK_URL) {
    const hook = await sendWebhook(report.slack, env);
    yield { type: "control.event", detector: "alert.webhook", policyId: "FIN-08", action: hook.sent ? "sent" : "skipped", recordId: `CE-${ce++}`, detail: hook.sent ? "Posted to the team channel" : `Webhook not sent: ${hook.reason}` };
  }
  yield {
    type: "panel", id: "email", kind: "email",
    props: {
      title: "Inbox",
      from: maskEmail(env.SMTP_FROM || "Night Watchman <alerts@example.com>"),
      to: maskEmail(env.ALERT_EMAIL_TO || "finance.controller@example.com"),
      subject: report.subject, text: report.text, sentAt: `${qatarTime()} Doha`,
    },
  };
  const atRisk = flags.reduce((s, f) => s + f.amount, 0);
  yield {
    type: "verdict", id: "verdict", status: mail.sent ? "ALERT SENT" : "ALERT RAISED", tone: "warn",
    headline: `${flags.length} issues worth ${qar(atRisk)} found in ${payments.length} payments. ${mail.sent ? "The report is in the controller's inbox." : "The report is ready for the controller."}`,
    reason: "Found by plain statistics, so every finding is exact and repeatable. The model only wrote the explanations, in English and Arabic.",
    evidence: [
      { label: "Checked", value: `${payments.length} payments, ${logins.length} logins` },
      { label: "Findings", value: flags.map((f) => KIND_LABEL[f.kind]).join(", ") },
      { label: "Model", value: ctx.llm.label },
    ],
  };
  yield { type: "pause" };

  yield { type: "act.start", act: 5, title: "Proof", subtitle: "Every finding traces to rows you can open." };
  yield {
    type: "panel", id: "proof", kind: "table",
    props: {
      title: "Findings and the records behind them",
      columns: [{ key: "kind", label: "Finding" }, { key: "ids", label: "Records" }, { key: "why", label: "Plain English" }],
      rows: flags.map((f, i) => ({ kind: KIND_LABEL[f.kind], ids: f.ids.join(", "), why: lines[i].en })),
    },
  };
  yield {
    type: "panel", id: "takeaway", kind: "markdown",
    props: { tone: "ok", title: "You don't need AI to find these. You need it to explain them.", text: "Statistics do the finding, exactly and repeatably. The model writes the explanation in two languages. The agent runs every night, stays quiet when there is nothing to say, and leaves an audit trail when there is." },
  };
  yield { type: "run.end", usage: ctx.llm.usage() };
};
