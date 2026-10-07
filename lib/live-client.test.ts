import { describe, it, expect } from "vitest";
import { fallbackCursor, parseSseChunk, withInactivityTimeout } from "./live-client";
import { vi } from "vitest";
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

describe("withInactivityTimeout", () => {
  it("passes events through and throws when the source goes quiet", async () => {
    vi.useFakeTimers();
    let release: (() => void) | null = null;
    async function* source(): AsyncGenerator<RunEvent> {
      yield A(1);
      await new Promise<void>((r) => { release = r; }); // never released: simulates a hung model call
      yield A(2);
    }
    const out: RunEvent[] = [];
    const run = (async () => { for await (const e of withInactivityTimeout(source(), 1000)) out.push(e); })();
    const failed = run.then(() => null, (e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(10);
    expect(out).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await failed).toMatch(/no event for 1000 ms/);
    void release;
    vi.useRealTimers();
  });
});
