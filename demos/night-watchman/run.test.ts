import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { run } from "./run";
import { maskEmail } from "./shared";
import type { Llm } from "@/lib/llm";
import type { RunContext } from "../types";
import type { RunEventInput } from "@/lib/events";

function fakeLlm(): Llm {
  return {
    label: "fake",
    async text() { return ""; },
    async *stream() { yield ""; },
    async parse(o: { prompt: string }) {
      const ids = [...o.prompt.matchAll(/"id":"(F\d)"/g)].map((m) => m[1]);
      return { notes: ids.map((id) => ({ id, en: `English ${id}.`, ar: `عربي ${id}.`, action: `Act on ${id}.` })) } as never;
    },
    async vision() { throw new Error("unused"); },
    async *tools() { throw new Error("unused"); },
    usage: () => ({ inputTokens: 0, outputTokens: 0, costUsd: 0 }),
  } as unknown as Llm;
}

async function events(env: Record<string, string | undefined> = {}) {
  const fx = (n: string) => path.join(__dirname, "fixtures", n);
  const ctx: RunContext = { mode: "record", llm: fakeLlm(), env, fixture: (n) => readFile(fx(n), "utf8"), fixtureBuffer: (n) => readFile(fx(n)) };
  const out: RunEventInput[] = [];
  for await (const e of run(ctx)) out.push(e);
  return out;
}

describe("night-watchman run", () => {
  it("flags the five planted issues and totals the money at risk in the verdict", async () => {
    const ev = await events();
    const table = ev.filter((e) => e.type === "panel.patch" && e.id === "flags").pop();
    const rows = table && table.type === "panel.patch" ? (table.patch.rows as { amount: string }[]) : [];
    expect(rows).toHaveLength(5);
    const v = ev.find((e) => e.type === "verdict");
    expect(v && v.type === "verdict" && v.headline).toMatch(/^5 issues worth QAR [\d,]+\.\d\d found in 500 payments/);
  });
  it("without SMTP: shows the email, says ALERT RAISED, and explains only in the evidence drawer", async () => {
    const ev = await events({});
    const email = ev.find((e) => e.type === "panel" && e.id === "email");
    expect(email && email.type === "panel" && String(email.props.subject)).toBe("Night shift report: 5 items need a look (Marsa Holdings AP)");
    expect(JSON.stringify(email)).not.toMatch(/SMTP/);
    const v = ev.find((e) => e.type === "verdict");
    expect(v && v.type === "verdict" && v.status).toBe("ALERT RAISED");
    expect(JSON.stringify(v)).not.toMatch(/SMTP/);
    const ce = ev.find((e) => e.type === "control.event" && e.detector === "alert.email");
    expect(ce && ce.type === "control.event" && ce.detail).toBe("Email not sent: SMTP_HOST not set");
  });
  it("puts each flag's English, Arabic and action in the email body", async () => {
    const ev = await events();
    const email = ev.find((e) => e.type === "panel" && e.id === "email");
    const text = email && email.type === "panel" ? String(email.props.text) : "";
    expect(text).toContain("عربي F1.");
    expect(text).toContain("Action: Act on F5.");
  });
  it("marks tonight on the timeline: running, then the alert count", async () => {
    const ev = await events();
    const states = ev.flatMap((e) => (e.type === "panel.patch" && e.id === "timeline" ? [(e.patch.nights as { state: string; count?: number }[]).at(-1)] : []));
    expect(states[0]?.state).toBe("running");
    expect(states.at(-1)).toMatchObject({ state: "alert", count: 5 });
  });
  it("masks email addresses so goldens never carry a real mailbox", () => {
    expect(maskEmail("Night Watchman <test@luminicious.net>")).toBe("Night Watchman <t•••@luminicious.net>");
    expect(maskEmail("cfo@example.com")).toBe("c•••@example.com");
  });
});
