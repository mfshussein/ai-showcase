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

function fakeLlm(reading?: unknown): Llm {
  return {
    label: "fake",
    async text() { return ""; },
    async *stream() { yield ""; },
    async parse() { throw new Error("unused"); },
    async vision(o: { schema?: { parse: (x: unknown) => unknown } }) {
      if (reading) return o.schema!.parse(reading) as never;
      return {
        cfoLines: ["Collections fell to 11.4 million.", "Tower C collected 41%.", "Occupancy is 82%."],
        anomalies: [
          { label: "Tower C collections", why: "41% against about 90% elsewhere.", box: { x: 60, y: 33, w: 37, h: 38 } },
          { label: "Off the image", why: "nonsense box", box: { x: 10, y: 98, w: 1, h: 1 } },
        ],
        questions: ["Why Tower C?", "Is 82% on track?", "What is 52 points?"],
      } as never;
    },
    async *tools() { throw new Error("unused"); },
    usage: () => ({ inputTokens: 0, outputTokens: 0, costUsd: 0 }),
  } as Llm;
}

async function events(reading?: unknown) {
  const ctx: RunContext = { mode: "record", llm: fakeLlm(reading), fixture: (n) => readFile(fx(n), "utf8"), fixtureBuffer: (n) => readFile(fx(n)) };
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
  it("survives imperfect output: extra items, a null box, an array box; the headline counts what was circled", async () => {
    const ev = await events({
      cfoLines: ["a", "b", "c", "d"],
      anomalies: [
        { label: "No box", why: "w", box: null },
        { label: "Array box", why: "w", box: [600, 330, 970, 710] },
        { label: "Third", why: "w", box: { x: 60, y: 33, w: 37, h: 38 } },
      ],
      questions: ["q1", "q2", "q3", "q4"],
    });
    const patch = ev.find((e) => e.type === "panel.patch" && e.id === "dash");
    const callouts = patch && patch.type === "panel.patch" ? (patch.patch.callouts as { label: string }[]) : [];
    expect(callouts.map((c) => c.label)).toEqual(["Array box"]);
    const v = ev.find((e) => e.type === "verdict");
    expect(v && v.type === "verdict" && v.headline).toMatch(/one anomaly circled/);
    const cfo = ev.find((e) => e.type === "panel" && e.id === "cfo");
    expect(cfo && cfo.type === "panel" && String(cfo.props.text).split("\n")).toHaveLength(3);
  });
});

import { toBox } from "./shared";
describe("toBox", () => {
  it("reads [x_min, y_min, x_max, y_max] on a 0-1000 scale as percent", () => {
    expect(toBox([566, 307, 978, 722], { width: 1280, height: 800 })).toEqual({ x: 56.6, y: 30.7, w: 41.2, h: 41.5 });
  });
  it("reads pixel corners when a value is beyond 1000", () => {
    expect(toBox([486, 246, 1259, 579], { width: 1280, height: 800 })).toMatchObject({ x: 37.96875, y: 30.75 });
  });
  it("keeps {x,y,w,h} objects and rejects junk", () => {
    expect(toBox({ x: 1, y: 2, w: 3, h: 4 }, { width: 10, height: 10 })).toEqual({ x: 1, y: 2, w: 3, h: 4 });
    expect(toBox([1, 2, 3], { width: 10, height: 10 })).toBeNull();
    expect(toBox([5, 5, 2, 2], { width: 10, height: 10 })).toBeNull();
  });
});
