import { describe, it, expect } from "vitest";
import { applyAll, initialRunState, reduceRun, segmentEvents, actsInRun, cursorForAct } from "./run-state";
import type { RunEvent } from "./events";

const ev = (e: Omit<RunEvent, "t"> & { t?: number }): RunEvent => ({ t: 0, ...e } as RunEvent);

describe("reduceRun", () => {
  it("upserts panels and patches props", () => {
    let s = reduceRun(initialRunState, ev({ type: "panel", id: "p", kind: "table", slot: "main", props: { rows: [] } }));
    s = reduceRun(s, ev({ type: "panel.patch", id: "p", patch: { rows: [1] } }));
    expect(s.panels).toHaveLength(1);
    expect(s.panels[0].props.rows).toEqual([1]);
  });
  it("appends text deltas and creates a markdown panel if missing", () => {
    let s = reduceRun(initialRunState, ev({ type: "text.delta", id: "ans", delta: "Hel" }));
    s = reduceRun(s, ev({ type: "text.delta", id: "ans", delta: "lo" }));
    expect(s.panels[0].kind).toBe("markdown");
    expect(s.panels[0].props.text).toBe("Hello");
  });
  it("act.start clears panels except keep list", () => {
    let s = reduceRun(initialRunState, ev({ type: "panel", id: "docs", kind: "files", slot: "left", props: {} }));
    s = reduceRun(s, ev({ type: "panel", id: "tmp", kind: "markdown", slot: "main", props: {} }));
    s = reduceRun(s, ev({ type: "act.start", act: 3, title: "Gasp", keep: ["docs"] }));
    expect(s.act).toBe(3);
    expect(s.panels.map((p) => p.id)).toEqual(["docs"]);
  });
  it("verdict becomes a verdict panel and control events accumulate", () => {
    let s = reduceRun(initialRunState, ev({ type: "verdict", id: "v", status: "QUARANTINED", tone: "quarantine", headline: "h", reason: "r", evidence: [] }));
    s = reduceRun(s, ev({ type: "control.event", detector: "d", policyId: "P1", action: "quarantine", recordId: "CE-1" }));
    expect(s.panels[0].kind).toBe("verdict");
    expect(s.controls).toHaveLength(1);
  });
  it("run.end marks ended and keeps usage", () => {
    const s = reduceRun(initialRunState, ev({ type: "run.end", usage: { inputTokens: 1, outputTokens: 2, costUsd: 0.01 } }));
    expect(s.ended).toBe(true);
    expect(s.usage?.costUsd).toBe(0.01);
  });
});

describe("segmentEvents / acts", () => {
  const events: RunEvent[] = [
    ev({ type: "run.start", demo: "d", mode: "replay", runId: "r" }),
    ev({ type: "act.start", act: 1, title: "Claim", keep: [] }),
    ev({ type: "pause" }),
    ev({ type: "act.start", act: 2, title: "Setup", keep: [] }),
    ev({ type: "act.start", act: 4, title: "Pin drop", keep: [] }),
    ev({ type: "run.end" }),
  ];
  it("splits on pause, pause ends its segment", () => {
    const segs = segmentEvents(events);
    expect(segs).toHaveLength(2);
    expect(segs[0][segs[0].length - 1].type).toBe("pause");
  });
  it("lists acts present even when numbers are skipped", () => {
    expect(actsInRun(events).map((a) => a.act)).toEqual([1, 2, 4]);
  });
  it("finds the cursor of an act start", () => {
    expect(cursorForAct(events, 4)).toBe(4);
    expect(cursorForAct(events, 3)).toBe(-1);
  });
  it("applyAll folds every event", () => {
    expect(applyAll(events).ended).toBe(true);
  });
});
