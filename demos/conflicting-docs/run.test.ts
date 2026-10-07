import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { FILES, naiveRetrieval, gateChecks, type Loaded } from "./shared";

async function load(): Promise<Loaded[]> {
  return Promise.all(FILES.map(async (name) => ({ name, text: await readFile(path.join(__dirname, "fixtures", name), "utf8") })));
}

describe("conflicting-docs preconditions", () => {
  it("the copy is a near-duplicate of v1 and v2 is not", async () => {
    const files = await load();
    const { dup } = gateChecks(files);
    expect(dup.duplicate).toBe(true);
    expect(gateChecks([files[0], files[2], files[2]]).dup.duplicate).toBe(false);
  });
  it("v1 and v2 differ on clauses 4.1 and 4.2 only", async () => {
    const { differing, h1, h2 } = gateChecks(await load());
    expect(differing.map((d) => d.id)).toEqual(["4.1", "4.2"]);
    expect(h1).toMatchObject({ version: "1.0", effectiveDate: "2022-03-01" });
    expect(h2).toMatchObject({ version: "2.0", effectiveDate: "2024-06-01" });
  });
  it("naive top-2 retrieval returns only 2022 passages for the customer's question", async () => {
    const hits = naiveRetrieval(await load(), 2);
    expect(hits).toHaveLength(2);
    expect(hits.every((h) => h.chunk.source !== "bereavement-policy-v2.md")).toBe(true);
    expect(hits.every((h) => h.chunk.text.includes("90 days"))).toBe(true);
  });
});

import { run } from "./run";
import type { Llm } from "@/lib/llm";
import type { RunContext } from "../types";

function fakeLlm(contradicts: boolean): Llm {
  return {
    label: "fake",
    async text() { return "ok"; },
    async *stream() { yield "answer"; },
    async parse() { return { contradicts, topic: "t", aQuote: "a", bQuote: "b", explanation: "because" } as never; },
    async vision() { return "img"; },
    async *tools() { throw new Error("unused"); },
    usage: () => ({ inputTokens: 0, outputTokens: 0, costUsd: 0 }),
  };
}

async function runWith(llm: Llm) {
  const ctx: RunContext = { mode: "record", llm, fixture: (n) => readFile(path.join(__dirname, "fixtures", n), "utf8"), fixtureBuffer: (n) => readFile(path.join(__dirname, "fixtures", n)) };
  const out = [];
  for await (const e of run(ctx)) out.push(e);
  return out;
}

describe("conflicting-docs verdict follows the classifier", () => {
  it("quarantines on a confirmed contradiction", async () => {
    const events = await runWith(fakeLlm(true));
    const v = events.find((e) => e.type === "verdict");
    expect(v && v.type === "verdict" && v.status).toBe("QUARANTINED");
  });
  it("holds for owner review, honestly, when no contradiction is confirmed", async () => {
    const events = await runWith(fakeLlm(false));
    const v = events.find((e) => e.type === "verdict");
    expect(v && v.type === "verdict" && v.status).toBe("HELD FOR REVIEW");
    expect(v && v.type === "verdict" && v.tone).toBe("warn");
    const gate = events.filter((e) => e.type === "panel.patch" && e.id === "gate").pop();
    expect(JSON.stringify(gate)).toContain("wording only");
  });
});
