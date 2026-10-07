import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { run } from "./run";
import type { Llm, ToolStep } from "@/lib/llm";
import type { RunContext } from "../types";
import type { RunEventInput } from "@/lib/events";

const DRAFT = "وعليكم السلام سارة...\n\nHello Sara...";
function script(withSend: boolean, finalText?: string): ToolStep[] {
  const s: ToolStep[] = [
    { type: "call", id: "1", name: "classify_enquiry", args: { intent: "purchase", language: "ar", summary: "2-bed" } },
    { type: "result", id: "1", name: "classify_enquiry", result: { recorded: true, queue: "Sales: residential" } },
    { type: "call", id: "2", name: "lookup_customer", args: { phone: "+974 5512 3487" } },
    { type: "result", id: "2", name: "lookup_customer", result: { found: true, customer: { id: "CUST-20418", name: "Sara Nasser" } } },
    { type: "call", id: "3", name: "check_policy", args: { topic: "financing" } },
    { type: "result", id: "3", name: "check_policy", result: { topic: "financing", policy: "..." } },
    { type: "call", id: "4", name: "log_to_crm", args: { customerId: "CUST-20418", intent: "purchase", summary: "2-bed, QAR 1.8M", nextAction: "Confirm Saturday viewing" } },
    { type: "result", id: "4", name: "log_to_crm", result: { created: true, id: "CRM-04211" } },
  ];
  if (withSend) s.push({ type: "call", id: "5", name: "send_whatsapp", args: { to: "+97455123487", text: DRAFT } }, { type: "result", id: "5", name: "send_whatsapp", result: { status: "HELD", reason: "x" } });
  s.push({ type: "final", text: finalText ?? (withSend ? "Reply held for approval." : DRAFT) });
  return s;
}

function fakeLlm(steps: ToolStep[], seen: { maxSteps?: number; tools?: string[] }): Llm {
  return {
    label: "fake",
    async text() { return ""; },
    async *stream() { yield ""; },
    async parse() { throw new Error("unused"); },
    async vision() { throw new Error("unused"); },
    async *tools(o: { maxSteps?: number; tools: { name: string }[] }) { seen.maxSteps = o.maxSteps; seen.tools = o.tools.map((t) => t.name); for (const s of steps) yield s; },
    usage: () => ({ inputTokens: 0, outputTokens: 0, costUsd: 0 }),
  } as unknown as Llm;
}

async function events(withSend = true, finalText?: string) {
  const seen: { maxSteps?: number; tools?: string[] } = {};
  const fx = (n: string) => path.join(__dirname, "fixtures", n);
  const ctx: RunContext = { mode: "record", llm: fakeLlm(script(withSend, finalText), seen), fixture: (n) => readFile(fx(n), "utf8"), fixtureBuffer: (n) => readFile(fx(n)) };
  const out: RunEventInput[] = [];
  for await (const e of run(ctx)) out.push(e);
  return { out, seen };
}
type Stage = { id: string; state: string };
const sendState = (e: RunEventInput) => (e.type === "panel.patch" && e.id === "plan" ? (e.patch.stages as Stage[]).find((s) => s.id === "send")?.state : undefined);

describe("enquiry-to-crm run", () => {
  it("offers all five tools with a step cap of 12", async () => {
    const { seen } = await events();
    expect(seen.maxSteps).toBe(12);
    expect(seen.tools).toEqual(["classify_enquiry", "lookup_customer", "check_policy", "log_to_crm", "send_whatsapp"]);
  });
  it("holds the send, then marks it sent only after the presenter advances", async () => {
    const { out } = await events();
    const verdicts = out.filter((e) => e.type === "verdict").map((e) => (e.type === "verdict" ? e.status : ""));
    expect(verdicts).toEqual(["HOLD", "SENT"]);
    const firstPass = out.findIndex((e) => sendState(e) === "pass");
    const lastPause = out.map((e) => e.type).lastIndexOf("pause");
    expect(firstPass).toBeGreaterThan(lastPause);
    expect(out.findIndex((e) => sendState(e) === "hold")).toBeLessThan(lastPause);
  });
  it("shows one trace row per tool call and the CRM card from log_to_crm", async () => {
    const { out } = await events();
    const trace = out.filter((e) => e.type === "panel.patch" && e.id === "trace").pop();
    expect(trace && trace.type === "panel.patch" && (trace.patch.rows as unknown[]).length).toBe(5);
    expect(JSON.stringify(out)).toContain("CRM-04211");
  });
  it("still gates the send when the model never calls send_whatsapp, using its final text as the draft", async () => {
    const { out } = await events(false);
    const hold = out.find((e) => e.type === "verdict");
    expect(hold && hold.type === "verdict" && hold.status).toBe("HOLD");
    const reply = out.find((e) => e.type === "panel" && e.id === "reply");
    expect(JSON.stringify(reply)).toContain("Hello Sara");
  });
  it("never shows the step-cap sentinel as the customer reply", async () => {
    const { out } = await events(false, "(stopped after 12 steps)");
    const reply = out.find((e) => e.type === "panel" && e.id === "reply");
    expect(JSON.stringify(reply)).not.toContain("(stopped");
    expect(JSON.stringify(reply)).toContain("No draft produced");
  });
});
