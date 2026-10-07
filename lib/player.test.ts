import { describe, it, expect, vi } from "vitest";
import { createPlayer } from "./player";
import { RunEvent, type RunEventInput } from "./events";

const E = (e: RunEventInput, t = 0): RunEvent => RunEvent.parse({ t, ...e });
const events: RunEvent[] = [
  E({ type: "run.start", demo: "d", mode: "replay", runId: "r" }, 0),
  E({ type: "act.start", act: 1, title: "A" }, 0),
  E({ type: "pause" }, 0),
  E({ type: "panel", id: "p", kind: "markdown", slot: "main", props: { text: "x" } }, 1000),
  E({ type: "text.delta", id: "p", delta: "y" }, 1500),
  E({ type: "pause" }, 1500),
  E({ type: "act.start", act: 2, title: "B" }, 1600),
  E({ type: "run.end" }, 1700),
];
const noop = () => {};

describe("createPlayer", () => {
  it("plays segment by segment honouring timing, capped at maxGapMs", () => {
    vi.useFakeTimers();
    const p = createPlayer({ events, speed: 1, maxGapMs: 400, onState: noop, onSegment: noop });
    p.next();
    expect(p.state().act).toBe(1);
    expect(p.playing()).toBe(false);
    p.next();
    vi.advanceTimersByTime(399);
    expect(p.state().panels.length).toBe(0);
    vi.advanceTimersByTime(1);
    expect(p.state().panels.length).toBe(1);
    vi.advanceTimersByTime(400);
    expect(p.state().panels[0].props.text).toBe("xy");
    expect(p.segment()).toBe(2);
    expect(p.playing()).toBe(false);
    vi.useRealTimers();
  });
  it("next while playing fast-forwards the current segment", () => {
    vi.useFakeTimers();
    const p = createPlayer({ events, speed: 1, maxGapMs: 400, onState: noop, onSegment: noop });
    p.next(); p.next(); p.next();
    expect(p.state().panels[0].props.text).toBe("xy");
    expect(p.segment()).toBe(2);
    vi.useRealTimers();
  });
  it("reaches the end and reports atEnd", () => {
    const p = createPlayer({ events, speed: 1, maxGapMs: 0, onState: noop, onSegment: noop });
    p.next(); p.next(); p.next();
    expect(p.state().ended).toBe(true);
    expect(p.atEnd()).toBe(true);
    p.next();
    expect(p.atEnd()).toBe(true);
  });
  it("back rewinds to the previous segment boundary", () => {
    const p = createPlayer({ events, speed: 1, maxGapMs: 0, onState: noop, onSegment: noop });
    p.next(); p.next(); p.next();
    expect(p.state().act).toBe(2);
    p.back();
    expect(p.state().act).toBe(1);
    expect(p.state().panels.length).toBe(1);
    p.back();
    expect(p.state().panels.length).toBe(0);
    expect(p.state().act).toBe(1);
    expect(p.segment()).toBe(1);
    p.back(); // floor: the blank state before the first act is never shown
    expect(p.state().act).toBe(1);
    expect(p.segment()).toBe(1);
  });
  it("reports state changes through onState", () => {
    const seen: number[] = [];
    const p = createPlayer({ events, speed: 1, maxGapMs: 0, onState: (s) => seen.push(s.act), onSegment: noop });
    p.next();
    expect(seen).toEqual([0, 1, 1]);
  });
  it("seek() jumps to a cursor instantly and leaves the player waiting there", () => {
    const p = createPlayer({ events, speed: 1, maxGapMs: 0, onState: noop, onSegment: noop });
    p.seek(6); // index of act.start 2: everything before is applied, nothing after
    expect(p.state().act).toBe(1);
    expect(p.state().panels[0].props.text).toBe("xy");
    expect(p.playing()).toBe(false);
    expect(p.segment()).toBe(2);
    p.next();
    expect(p.state().act).toBe(2);
  });
  it("back() never rewinds to the blank state before the first act", () => {
    const p = createPlayer({ events, speed: 1, maxGapMs: 0, onState: noop, onSegment: noop });
    p.next(); p.next();
    p.back();
    expect(p.state().act).toBe(1);
    p.back();
    expect(p.state().act).toBe(1);
    expect(p.segment()).toBe(1);
  });
  it("accepts pushed live events and waits at a pause", () => {
    const p = createPlayer({ events: [], speed: 1, maxGapMs: 0, onState: noop, onSegment: noop, live: true });
    p.push(events[0]); p.push(events[1]);
    expect(p.state().act).toBe(0);
    p.next();
    expect(p.state().act).toBe(1);
    p.push(events[2]); p.push(events[3]);
    expect(p.state().panels.length).toBe(0);
    p.next();
    expect(p.state().panels.length).toBe(1);
    p.push(events[4]);
    expect(p.state().panels[0].props.text).toBe("xy");
  });
});
