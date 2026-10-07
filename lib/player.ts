import type { RunEvent } from "./events";
import { initialRunState, reduceRun, type RunState } from "./run-state";

export interface PlayerOptions {
  events: RunEvent[];
  /** Playback speed multiplier for recorded gaps. */
  speed: number;
  /** Longest wait between two events, so a slow live recording never stalls the room. */
  maxGapMs: number;
  onState: (s: RunState) => void;
  onSegment: (i: number) => void;
  /** Live mode: events arrive via push() and play as they arrive (no recorded gaps). */
  live?: boolean;
}

export interface Player {
  /** Play the next segment, or fast-forward the one in progress. */
  next(): void;
  /** Return to the state shown before the current segment. */
  back(): void;
  /** Append a live event. */
  push(ev: RunEvent): void;
  state(): RunState;
  /** Index of the segment that will play next (number of segments completed). */
  segment(): number;
  playing(): boolean;
  atEnd(): boolean;
  dispose(): void;
}

export function createPlayer(o: PlayerOptions): Player {
  const queue: RunEvent[] = o.events.slice();
  let cursor = 0;
  let segment = 0;
  let state: RunState = initialRunState;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let waiting = true;
  const boundaries: number[] = [0];

  const apply = (ev: RunEvent) => { state = reduceRun(state, ev); o.onState(state); };
  const stop = () => { if (timer) clearTimeout(timer); timer = null; };
  const endSegment = () => { segment++; boundaries[segment] = cursor; waiting = true; o.onSegment(segment); };

  const scheduleNext = () => {
    if (cursor >= queue.length) { if (!o.live) waiting = true; return; }
    const prev = cursor > 0 ? queue[cursor - 1] : null;
    const nxt = queue[cursor];
    const gap = o.live || !prev ? 0 : Math.min(Math.max(0, (nxt.t - prev.t) / o.speed), o.maxGapMs);
    if (gap === 0) step();
    else timer = setTimeout(step, gap);
  };
  const step = () => {
    timer = null;
    const ev = queue[cursor++];
    apply(ev);
    if (ev.type === "pause") { endSegment(); return; }
    scheduleNext();
  };
  const fastForward = () => {
    stop();
    while (cursor < queue.length) {
      const ev = queue[cursor++];
      apply(ev);
      if (ev.type === "pause") { endSegment(); return; }
    }
    if (!o.live) waiting = true;
  };

  return {
    next() {
      if (!waiting) { fastForward(); return; }
      if (cursor >= queue.length) return;
      waiting = false;
      scheduleNext();
    },
    back() {
      stop();
      let target = segment;
      if (cursor === boundaries[segment]) target = segment - 1;
      if (target < 0) { waiting = true; return; }
      segment = target;
      cursor = boundaries[target] ?? 0;
      state = initialRunState;
      for (let i = 0; i < cursor; i++) state = reduceRun(state, queue[i]);
      waiting = true;
      o.onState(state);
      o.onSegment(segment);
    },
    push(ev) {
      queue.push(ev);
      if (!waiting && !timer) scheduleNext();
    },
    state: () => state,
    segment: () => segment,
    playing: () => !waiting,
    atEnd: () => cursor >= queue.length && state.ended,
    dispose: stop,
  };
}
