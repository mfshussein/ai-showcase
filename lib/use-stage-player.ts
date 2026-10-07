"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GoldenRun, RunEvent } from "./events";
import { initialRunState, type RunState } from "./run-state";
import { createPlayer, type Player } from "./player";
import { liveRun, fallbackCursor } from "./live-client";

export type StageMode = "replay" | "live" | "cached";

/** Owns the player for a demo: replay from the golden run, or a live SSE run that falls back to the golden on failure. */
export function useStagePlayer(slug: string, golden: GoldenRun) {
  const playerRef = useRef<Player | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<RunState>(initialRunState);
  const [segment, setSegment] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const [mode, setMode] = useState<StageMode>("replay");
  const [liveError, setLiveError] = useState<string | null>(null);

  const mount = useCallback((p: Player) => {
    playerRef.current?.dispose();
    playerRef.current = p;
  }, []);

  const startReplay = useCallback((fromCursor = 0) => {
    abortRef.current?.abort();
    const p = createPlayer({
      events: golden.events, speed: 1, maxGapMs: 900,
      onState: (s) => { setState(s); setAtEnd(p.atEnd()); },
      onSegment: setSegment,
    });
    mount(p);
    // Skip silently to the segment where a live run failed, then play that act with timing.
    const skip = golden.events.slice(0, fromCursor).filter((e) => e.type === "pause").length;
    for (let i = 0; i < skip; i++) { p.next(); p.next(); }
    p.next();
  }, [golden, mount]);

  const startLive = useCallback(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const received: RunEvent[] = [];
    const p = createPlayer({
      events: [], speed: 1, maxGapMs: 0, live: true,
      onState: (s) => { setState(s); setAtEnd(p.atEnd()); },
      onSegment: setSegment,
    });
    mount(p);
    setMode("live");
    setLiveError(null);
    p.next();
    (async () => {
      try {
        for await (const ev of liveRun(slug, ac.signal)) { received.push(ev); p.push(ev); }
        if (!received.some((e) => e.type === "run.end")) throw new Error("live run ended early");
      } catch (e) {
        if (ac.signal.aborted) return;
        setLiveError((e as Error).message);
        setMode("cached");
        startReplay(fallbackCursor(golden.events, received));
      }
    })();
  }, [slug, golden, mount, startReplay]);

  useEffect(() => {
    startReplay(0);
    return () => { abortRef.current?.abort(); playerRef.current?.dispose(); playerRef.current = null; };
  }, [startReplay]);

  const next = useCallback(() => playerRef.current?.next(), []);
  const back = useCallback(() => playerRef.current?.back(), []);
  const restartReplay = useCallback(() => { setMode("replay"); setLiveError(null); startReplay(0); }, [startReplay]);

  return { state, segment, atEnd, mode, liveError, next, back, startLive, restartReplay };
}
