import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { run } from "./run";
import { normaliseArabic, type Term } from "@/lib/harness/glossary";
import type { Llm } from "@/lib/llm";
import type { RunContext } from "../types";

const fx = (n: string) => path.join(__dirname, "fixtures", n);

describe("glossary-translation preconditions", () => {
  it("has 14 terms and every Arabic term occurs in the notice", async () => {
    const g = JSON.parse(await readFile(fx("glossary.json"), "utf8")) as Term[];
    const src = normaliseArabic(await readFile(fx("notice.ar.md"), "utf8"));
    expect(g).toHaveLength(14);
    for (const t of g) expect(src, t.ar).toContain(normaliseArabic(t.ar));
  });
});

async function allTerms() {
  return (JSON.parse(await readFile(fx("glossary.json"), "utf8")) as Term[]).map((t) => t.en).join(". ");
}

function fakeLlm(texts: { plain: string; locked: string; reask: string }): Llm & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    label: "fake",
    async text() { calls.push("reask"); return texts.reask; },
    async *stream(o: { system?: string }) { const k = o.system?.includes("House glossary") ? "locked" : "plain"; calls.push(k); yield texts[k]; },
    async parse() { throw new Error("unused"); },
    async vision() { throw new Error("unused"); },
    async *tools() { throw new Error("unused"); },
    usage: () => ({ inputTokens: 0, outputTokens: 0, costUsd: 0 }),
  } as unknown as Llm & { calls: string[] };
}

async function events(llm: Llm) {
  const ctx: RunContext = { mode: "record", llm, fixture: (n) => readFile(fx(n), "utf8"), fixtureBuffer: (n) => readFile(fx(n)) };
  const out = [];
  for await (const e of run(ctx)) out.push(e);
  return out;
}
const verdictOf = (ev: Awaited<ReturnType<typeof events>>) => { const v = ev.find((e) => e.type === "verdict"); return v && v.type === "verdict" ? v : null; };

describe("glossary-translation run", () => {
  it("passes 14/14 without a re-ask when the glossary run is exact", async () => {
    const llm = fakeLlm({ plain: "Qatar Central Bank and Murabaha", locked: await allTerms(), reask: "" });
    const v = verdictOf(await events(llm));
    expect(v?.status).toBe("GLOSSARY 14/14");
    expect(llm.calls).toEqual(["plain", "locked"]);
  });
  it("re-asks once and passes when the correction is exact", async () => {
    const llm = fakeLlm({ plain: "Murabaha", locked: "Murabaha only", reask: await allTerms() });
    const v = verdictOf(await events(llm));
    expect(v?.status).toBe("GLOSSARY 14/14");
    expect(llm.calls).toEqual(["plain", "locked", "reask"]);
  });
  it("holds for a reviewer when the re-ask still misses", async () => {
    const llm = fakeLlm({ plain: "Murabaha", locked: "Murabaha only", reask: "Murabaha and Zakat" });
    const v = verdictOf(await events(llm));
    expect(v?.status).toBe("2/14 HELD FOR REVIEWER");
    expect(v?.tone).toBe("warn");
  });
  it("counts the natural translation honestly", async () => {
    const ev = await events(fakeLlm({ plain: "Qatar Central Bank (QCB) and Murabaha", locked: await allTerms(), reask: "" }));
    const counter = ev.find((e) => e.type === "panel" && e.id === "plain" && e.kind === "counter");
    expect(counter && counter.type === "panel" && counter.props.value).toBe(2);
  });
});
