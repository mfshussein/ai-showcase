import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { run } from "./run";
import type { Llm } from "@/lib/llm";
import type { RunContext } from "../types";

const f = (value: string | number | null, confidence = 0.97) => ({ value, confidence });
const RECORDS: Record<string, unknown> = {
  invoice: { supplier: f("Ghaf Line"), invoiceNumber: f("GLF-2026-04417"), date: f("2026-09-28"), currency: f("AED"), subtotal: f(12400), vatRate: f(0.05), vat: f(680), total: f(13120) },
  id: { idNumber: f("28563400123"), nameEnglish: f("SAMPLE, AHMED"), nameArabic: f("أحمد نموذج"), dateOfBirth: f("1985-06-02"), expiry: f("2025-03-14"), nationality: f("SPECIMEN") },
  note: { noteNumber: f("DN 7731"), date: f("2026-10-05"), deliverTo: f("Marina Tower 3 site, Lusail"), receivedBy: f("M. Farouk"), lines: [{ item: f("Cement"), qty: f(17, 0.55), unit: f("pallets") }] },
};

function fakeLlm(records = RECORDS, failId = false): Llm {
  return {
    label: "fake",
    async text() { return ""; },
    async *stream() { yield ""; },
    async parse() { throw new Error("unused"); },
    async vision(o: { prompt: string }) { if (failId && o.prompt.includes("identity card")) throw new Error("structured output failed to parse after one retry"); return (o.prompt.includes("tax invoice") ? records.invoice : o.prompt.includes("identity card") ? records.id : records.note) as never; },
    async *tools() { throw new Error("unused"); },
    usage: () => ({ inputTokens: 0, outputTokens: 0, costUsd: 0 }),
  } as unknown as Llm;
}

async function events(llm = fakeLlm()) {
  const fx = (n: string) => path.join(__dirname, "fixtures", n);
  const ctx: RunContext = { mode: "record", llm, fixture: (n) => readFile(fx(n), "utf8"), fixtureBuffer: (n) => readFile(fx(n)) };
  const out = [];
  for await (const e of run(ctx)) out.push(e);
  return out;
}

describe("document-to-json", () => {
  it("blocks the invoice and the expired ID, holds the uncertain note, and releases nothing", async () => {
    const ev = await events();
    const v = ev.find((e) => e.type === "verdict");
    expect(v && v.type === "verdict" && v.status).toBe("0 OF 3 RELEASED");
    expect(v && v.type === "verdict" && v.reason).toMatch(/^2 blocked by validation, 1 waiting for a human check/);
  });
  it("marks the failing fields on the record", async () => {
    const ev = await events();
    const patches = ev.filter((e) => e.type === "panel.patch" && e.id === "record");
    const inv = patches[0].type === "panel.patch" ? (patches[0].patch.fields as { path: string; tone: string }[]) : [];
    expect(inv.find((x) => x.path === "vat")?.tone).toBe("block");
    expect(inv.find((x) => x.path === "subtotal")?.tone).toBe("ok");
    const note = patches[2].type === "panel.patch" ? (patches[2].patch.fields as { path: string; tone: string }[]) : [];
    expect(note.find((x) => x.path === "lines[0].qty")?.tone).toBe("warn");
  });
  it("releases a clean record", async () => {
    const clean = { ...RECORDS, invoice: { ...(RECORDS.invoice as object), vat: f(620), total: f(13020) } };
    const ev = await events(fakeLlm(clean));
    const v = ev.find((e) => e.type === "verdict");
    expect(v && v.type === "verdict" && v.status).toBe("1 OF 3 RELEASED");
  });
  it("shows the KYC caveat on screen", async () => {
    const ev = await events();
    expect(JSON.stringify(ev)).toContain("licensed KYC provider");
  });
  it("normalises percent confidences and a VAT rate given as 5", async () => {
    const pct = (value: string | number | null, confidence = 97) => ({ value, confidence });
    const invoice = { supplier: pct("Ghaf"), invoiceNumber: pct("x"), date: pct("2026-09-28"), currency: pct("AED"), subtotal: pct(12400), vatRate: pct(5), vat: pct(620), total: pct(13020) };
    const ev = await events(fakeLlm({ ...RECORDS, invoice }));
    const checks = ev.find((e) => e.type === "panel" && e.id === "checks");
    expect(JSON.stringify(checks)).toContain("VAT 620.00 is 5% of 12,400.00");
    const rec = ev.find((e) => e.type === "panel.patch" && e.id === "record");
    expect(rec && rec.type === "panel.patch" && (rec.patch.fields as { confidence: number }[])[0].confidence).toBeCloseTo(0.97);
    const v = ev.find((e) => e.type === "verdict");
    expect(v && v.type === "verdict" && v.status).toBe("1 OF 3 RELEASED");
  });
  it("asks a human when a figure is unreadable instead of printing NaN", async () => {
    const invoice = { ...(RECORDS.invoice as object), total: f(null) };
    const ev = await events(fakeLlm({ ...RECORDS, invoice }));
    const checks = ev.find((e) => e.type === "panel" && e.id === "checks");
    expect(JSON.stringify(checks)).not.toContain("NaN");
    expect(JSON.stringify(checks)).not.toContain("printed 0.00");
    expect(JSON.stringify(checks)).toContain("Could not read");
  });
  it("keeps going when one document cannot be extracted, and holds it for a human", async () => {
    const ev = await events(fakeLlm(RECORDS, true));
    const v = ev.find((e) => e.type === "verdict");
    expect(v && v.type === "verdict" && v.status).toBe("0 OF 3 RELEASED");
    expect(v && v.type === "verdict" && v.reason).toMatch(/^1 blocked by validation, 2 waiting for a human check/);
  });
});
