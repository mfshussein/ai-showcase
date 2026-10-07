import type { DemoRunner } from "../types";
import type { ToolStep } from "@/lib/llm";
import { makeTools, HOLD_REASON, type CrmRecord, type Data } from "./tools";

type StageState = "idle" | "pass" | "fire" | "hold" | "skip";
type Stage = { id: string; label: string; state: StageState; note?: string };
const STAGES: Stage[] = [
  { id: "classify", label: "Classify", state: "idle" },
  { id: "lookup", label: "Look up customer", state: "idle" },
  { id: "policy", label: "Check policy", state: "idle" },
  { id: "draft", label: "Draft reply", state: "idle" },
  { id: "crm", label: "Log to CRM", state: "idle" },
  { id: "send", label: "Send", state: "idle" },
];
const STAGE_OF: Record<string, string> = { classify_enquiry: "classify", lookup_customer: "lookup", check_policy: "policy", log_to_crm: "crm", send_whatsapp: "draft" };

const SYSTEM = `You are the WhatsApp enquiry assistant for Lusail Residences, a fictional residential development in Lusail, Qatar, sold by Sadeem Developments.
For each inbound message, use the tools in this order: classify_enquiry; lookup_customer with the sender's phone; check_policy for every topic the customer raises plus "communication"; log_to_crm with a one-line summary and the next action; then send_whatsapp with your reply.
Follow the policies exactly: reply in the customer's language, bilingual for a first reply to an Arabic enquiry (Arabic first, then English); quote listed prices only; no discounts; no financing advice; offer a specific viewing slot. Greet returning customers by name. Keep the reply under 120 words per language. No emoji. After send_whatsapp, end with one short sentence for the sales team.`;

const NO_DRAFT = "No draft produced: the agent stopped before writing a reply. A person needs to reply to this customer.";

const summarise = (name: string, args: unknown, result: unknown): string => {
  const a = (args ?? {}) as Record<string, unknown>;
  const r = (result ?? {}) as Record<string, unknown>;
  if (r.error) return `error: ${String(r.error)}`;
  if (name === "classify_enquiry") return `${String(a.intent)} → ${String(r.queue)}`;
  if (name === "lookup_customer") return r.found ? `found ${String((r.customer as Record<string, unknown>)?.name)}` : "new customer";
  if (name === "check_policy") return String(a.topic);
  if (name === "log_to_crm") return `created ${String(r.id)}`;
  if (name === "send_whatsapp") return `${String(r.status)}: awaiting approval`;
  return "";
};

export const run: DemoRunner = async function* (ctx) {
  const message = (await ctx.fixture("message.ar.txt")).trim();
  const data = JSON.parse(await ctx.fixture("data.json")) as Data;
  const log: CrmRecord[] = [];
  const stages = STAGES.map((s) => ({ ...s }));
  const set = (id: string, state: StageState, note?: string) => { const s = stages.find((x) => x.id === id)!; s.state = state; s.note = note; };
  const plan = () => ({ stages: stages.map((s) => ({ ...s })) });

  yield { type: "run.start", demo: "enquiry-to-crm", mode: "live", runId: crypto.randomUUID() };

  yield { type: "act.start", act: 1, title: "The claim" };
  yield {
    type: "panel", id: "claim", kind: "markdown",
    props: {
      size: "display",
      title: "It does the legwork. It cannot press send.",
      text: "A buyer messages on WhatsApp, in Arabic, at nine in the morning. The agent classifies it, finds the customer, reads the policy, drafts a bilingual reply and logs it. Sending waits for a person, because the system says so, not the prompt.",
    },
  };
  yield { type: "pause" };

  yield { type: "act.start", act: 2, title: "The enquiry", subtitle: "Lusail Residences, a fictional development. One message, five tools." };
  yield { type: "panel", id: "plan", kind: "gate", props: { title: "The agent's plan", ...plan() } };
  yield {
    type: "panel", id: "inbound", kind: "chat", slot: "left",
    props: { title: `${data.inbound.channel}, ${data.inbound.from}, ${data.inbound.receivedAt}`, messages: [{ role: "user", text: message }] },
  };
  yield {
    type: "panel", id: "toolbox", kind: "table", slot: "right",
    props: {
      title: "Tools the agent may call",
      columns: [{ key: "tool", label: "Tool" }, { key: "what", label: "What it does" }],
      rows: makeTools(data, []).map((t) => ({ tool: t.name, what: t.name === "send_whatsapp" ? { text: "Held for human approval by the harness", tone: "warn" } : t.description })),
    },
  };
  yield { type: "pause" };

  yield { type: "act.start", act: 4, title: "The agent works", subtitle: "Every tool call is visible: what went in, what came out.", keep: ["plan"] };
  const trace: { step: number; tool: string; result: string }[] = [];
  yield { type: "panel", id: "trace", kind: "table", slot: "left", props: { title: "Tool calls", columns: [{ key: "step", label: "#" }, { key: "tool", label: "Tool" }, { key: "result", label: "Result" }], rows: [] } };
  const calls = new Map<string, { name: string; args: unknown }>();
  let draft = "";
  let crm: { id: string; args: Record<string, unknown> } | null = null;
  let customer: Record<string, unknown> | null = null;
  let sendCalled = false;
  let final = "";
  const steps: AsyncGenerator<ToolStep> = ctx.llm.tools({
    model: "main", effort: "low", maxTokens: 1500, maxSteps: 12, system: SYSTEM, tools: makeTools(data, log),
    prompt: `Inbound ${data.inbound.channel} message from ${data.inbound.from} at ${data.inbound.receivedAt}:\n\n${message}`,
  });
  for await (const s of steps) {
    if (s.type === "call") {
      calls.set(s.id, { name: s.name, args: s.args });
      const stage = STAGE_OF[s.name];
      if (stage) { set(stage, "hold", "working"); yield { type: "panel.patch", id: "plan", patch: plan() }; }
      yield { type: "panel", id: "tool", kind: "json", slot: "right", props: { title: `${s.name}: input`, value: s.args } };
    } else if (s.type === "result") {
      const c = calls.get(s.id);
      const args = (c?.args ?? {}) as Record<string, unknown>;
      const result = (s.result ?? {}) as Record<string, unknown>;
      trace.push({ step: trace.length + 1, tool: s.name, result: summarise(s.name, args, result) });
      yield { type: "panel.patch", id: "trace", patch: { rows: trace.map((r) => ({ ...r })) } };
      yield { type: "panel", id: "tool", kind: "json", slot: "right", props: { title: `${s.name}: input and output`, value: { input: args, output: result } } };
      if (s.name === "lookup_customer" && result.found) customer = result.customer as Record<string, unknown>;
      if (s.name === "log_to_crm" && typeof result.id === "string") crm = { id: result.id, args };
      if (s.name === "send_whatsapp") {
        sendCalled = true;
        draft = String(args.text ?? "");
        set("draft", "pass");
        set("send", "hold", "awaiting approval");
        yield { type: "control.event", detector: "approval.gate", policyId: "GOV-03", action: "hold", recordId: "CE-5001", detail: `send_whatsapp to ${String(args.to)} intercepted: ${HOLD_REASON}` };
      } else {
        const stage = STAGE_OF[s.name];
        if (stage) set(stage, result.error ? "fire" : "pass");
      }
      yield { type: "panel.patch", id: "plan", patch: plan() };
    } else {
      final = s.text;
    }
  }
  if (!sendCalled) {
    // The model never tried to send. The harness still owns the send step: the final text becomes the draft, and it is held.
    // A stopped loop or an empty reply is not a draft: say so rather than show a sentinel as the customer reply.
    draft = !final.trim() || /^\(stopped after \d+ steps\)$/.test(final.trim()) ? NO_DRAFT : final;
    set("draft", "pass");
    set("send", "hold", "awaiting approval");
    yield { type: "panel.patch", id: "plan", patch: plan() };
    yield { type: "control.event", detector: "approval.gate", policyId: "GOV-03", action: "hold", recordId: "CE-5001", detail: "draft held for approval; the agent did not attempt to send" };
  }
  yield { type: "panel.remove", id: "tool" };
  yield { type: "panel", id: "reply", kind: "chat", slot: "right", props: { title: "Draft reply, not sent", messages: [{ role: "assistant", text: draft, note: "Held: waiting for a person to approve" }] } };
  if (crm) {
    yield {
      type: "panel", id: "crm", kind: "table", slot: "left",
      props: {
        title: `CRM activity ${crm.id}`,
        columns: [{ key: "k", label: "Field" }, { key: "v", label: "Value" }],
        rows: [
          { k: "Customer", v: customer ? `${String(customer.name)} (${String(customer.id)}), ${String(customer.status)}` : "New lead" },
          { k: "Intent", v: String(crm.args.intent ?? "") },
          { k: "Summary", v: String(crm.args.summary ?? "") },
          { k: "Next action", v: String(crm.args.nextAction ?? "") },
          { k: "Reply", v: { text: "HELD FOR APPROVAL", tone: "warn" } },
        ],
      },
    };
  }
  yield {
    type: "verdict", id: "verdict", status: "HOLD", tone: "warn",
    headline: "Reply drafted and logged. Sending waits for a person.",
    reason: "send_whatsapp is a tool the harness intercepts. The agent can ask to send; only an approver can release it.",
    evidence: [
      { label: "Tool calls", value: String(trace.length) },
      { label: "CRM", value: crm?.id ?? "not logged" },
      { label: "Policy", value: HOLD_REASON },
      { label: "Model", value: ctx.llm.label },
    ],
  };
  yield { type: "pause", label: "Approve and send" };

  yield { type: "act.start", act: 5, title: "A person approves", keep: ["plan", "reply", "crm"] };
  set("send", "pass", "sent 09:41");
  yield { type: "panel.patch", id: "plan", patch: plan() };
  yield { type: "panel", id: "reply", kind: "chat", slot: "right", props: { title: "Reply, sent", messages: [{ role: "assistant", text: draft, note: "Approved by Noora, Sales, 09:41. Sent." }] } };
  if (crm) yield { type: "panel.patch", id: "crm", patch: { title: `CRM activity ${crm.id}, updated` } };
  yield { type: "control.event", detector: "approval.gate", policyId: "GOV-03", action: "release", recordId: "CE-5002", detail: "approved by Noora (Sales) at 09:41" };
  yield {
    type: "verdict", id: "verdict", status: "SENT", tone: "ok",
    headline: "Approved by Noora at 09:41, then sent. The audit trail has both.",
    reason: "The agent did minutes of work in seconds. A named person made the one decision that reaches a customer.",
    evidence: [{ label: "Approver", value: "Noora, Sales" }, { label: "Approved", value: "09:41" }, { label: "CRM", value: crm?.id ?? "not logged" }],
  };
  yield {
    type: "panel", id: "takeaway", kind: "markdown",
    props: { tone: "ok", title: "Agents that act need a gate that is code.", text: "Every step visible, every tool call logged, and the actions that reach customers or money wait for a named approver." },
  };
  yield { type: "run.end", usage: ctx.llm.usage() };
};
