import { describe, it, expect } from "vitest";
import { RunEvent, parseGolden } from "./events";

describe("RunEvent", () => {
  it("accepts a panel event with default slot", () => {
    const ev = RunEvent.parse({ type: "panel", t: 0, id: "a", kind: "markdown", props: { text: "hi" } });
    expect(ev.type === "panel" && ev.slot).toBe("main");
  });
  it("rejects an unknown panel kind", () => {
    expect(() => RunEvent.parse({ type: "panel", t: 0, id: "a", kind: "hologram", props: {} })).toThrow();
  });
  it("rejects negative t", () => {
    expect(() => RunEvent.parse({ type: "pause", t: -1 })).toThrow();
  });
  it("parses a golden run and requires run.end last", () => {
    const g = parseGolden({
      demo: "x", recordedAt: "2026-10-07T00:00:00Z", model: "claude-opus-5-5",
      events: [{ type: "run.start", t: 0, demo: "x", mode: "live", runId: "r" }, { type: "run.end", t: 5 }],
    });
    expect(g.events).toHaveLength(2);
    expect(() => parseGolden({ demo: "x", recordedAt: "", model: "", events: [{ type: "pause", t: 0 }] })).toThrow(/run.end/);
  });
});
