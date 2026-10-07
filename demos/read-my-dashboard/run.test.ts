import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { run } from "./run";
import { TilesFile, PICK } from "./shared";
import type { Llm } from "@/lib/llm";
import type { RunContext } from "../types";

const fx = (n: string) => path.join(__dirname, "fixtures", n);

describe("read-my-dashboard preconditions", () => {
  it("the picked dashboard has measured tiles including the towers chart and the occupancy KPI", async () => {
    const layout = TilesFile.parse(JSON.parse(await readFile(fx(`${PICK}.tiles.json`), "utf8")));
    expect(layout.tiles.map((t) => t.id)).toEqual(expect.arrayContaining(["towers", "occupancy"]));
  });
  it("the planted figures are on screen", async () => {
    const text = await readFile(fx(`${PICK}.text.txt`), "utf8");
    for (const s of ["41%", "82%", "على المسار"]) expect(text).toContain(s);
  });
});

function fakeLlm(): Llm {
  return {
    label: "fake",
    async text() { return ""; },
    async *stream() { yield ""; },
    async parse() { throw new Error("unused"); },
    async vision() {
      return {
        cfoLines: ["Collections fell to 11.4 million.", "Tower C collected 41%.", "Occupancy is 82%."],
        anomalies: [
          { label: "Tower C collections", why: "41% against about 90% elsewhere.", box: { x: 60, y: 33, w: 37, h: 38 } },
          { label: "Off the image", why: "nonsense box", box: { x: 10, y: 98, w: 1, h: 1 } },
        ],
        questions: ["Why Tower C?", "Is 82% on track?", "What is 52 points?"],
      } as never;
    },
    async tools() { throw new Error("unused"); },
    usage: () => ({ inputTokens: 0, outputTokens: 0, costUsd: 0 }),
  } as Llm;
}

async function events() {
  const ctx: RunContext = { mode: "record", llm: fakeLlm(), fixture: (n) => readFile(fx(n), "utf8"), fixtureBuffer: (n) => readFile(fx(n)) };
  const out = [];
  for await (const e of run(ctx)) out.push(e);
  return out;
}

describe("read-my-dashboard run", () => {
  it("draws only callouts that snap to a tile, and times the read", async () => {
    const ev = await events();
    const patch = ev.find((e) => e.type === "panel.patch" && e.id === "dash");
    expect(patch && patch.type === "panel.patch" && (patch.patch.callouts as unknown[]).length).toBe(1);
    const v = ev.find((e) => e.type === "verdict");
    expect(v && v.type === "verdict" && v.status).toMatch(/^READ IN \d+\.\d S$/);
  });
  it("traces quoted figures: printed ones pass, derived ones are flagged", async () => {
    const ev = await events();
    const trace = ev.find((e) => e.type === "panel" && e.id === "trace");
    const rows = trace && trace.type === "panel" ? (trace.props.rows as { figure: string; status: { text: string } }[]) : [];
    expect(rows.find((r) => r.figure === "41")?.status.text).toBe("PRINTED");
    expect(rows.find((r) => r.figure === "52")?.status.text).toMatch(/CHECK/);
  });
});
