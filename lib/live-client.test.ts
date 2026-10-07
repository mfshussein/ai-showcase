import { describe, it, expect } from "vitest";
import { fallbackCursor, parseSseChunk } from "./live-client";
import type { RunEvent } from "@/lib/events";

const A = (act: number, t = 0): RunEvent => ({ type: "act.start", t, act, title: "", keep: [] });
const golden: RunEvent[] = [{ type: "run.start", t: 0, demo: "d", mode: "replay", runId: "g" }, A(1), A(2), A(3), { type: "run.end", t: 9 }];

describe("fallbackCursor", () => {
  it("returns the golden index of the last act started live", () => {
    expect(fallbackCursor(golden, [golden[0], A(1), A(2), A(3)])).toBe(3);
  });
  it("returns 0 when no act started", () => { expect(fallbackCursor(golden, [golden[0]])).toBe(0); });
  it("returns 0 when the live act is not in the golden", () => { expect(fallbackCursor(golden, [A(5)])).toBe(0); });
});

describe("parseSseChunk", () => {
  it("splits data frames and keeps the remainder", () => {
    const { events, rest } = parseSseChunk('data: {"type":"pause","t":1}\n\ndata: {"ty');
    expect(events).toEqual([{ type: "pause", t: 1 }]);
    expect(rest).toBe('data: {"ty');
  });
  it("throws on an error frame with the server message", () => {
    expect(() => parseSseChunk('event: error\ndata: {"message":"boom"}\n\n')).toThrow(/boom/);
  });
});
