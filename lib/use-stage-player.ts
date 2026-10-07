"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GoldenRun, RunEvent } from "./events";
import { initialRunState, type RunState } from "./run-state";
import { createPlayer, type Player } from "./player";
import { liveRun, fallbackCursor, withInactivityTimeout } from "./live-client";

export type StageMode = "replay" | "live" | "cached";

/** A live run that goes quiet this long is abandoned and the stage continues from the recording. */
const LIVE_INACTIVITY_MS = 25_000;

/** Owns the player for a demo: replay from the golden run, or a live SSE run that falls back to the golden on failure. */
export function useStagePlayer(slug: string, golden: GoldenRun) {
  const playerRef = useRef<Player | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const receivedRef = useRef<RunEvent[]>([]);
  const [state, setState] = useState<RunState>(initialRunState);
  const [segment, setSegment] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const [mode, setMode] = useState<StageMode>("replay");
  const [liveError, setLiveError] = useState<string | null>(null);

  const mount = useCallback((p: Player) => {
    playerRef.current?.dispose();
    playerRef.current = p;
  }, []);

  /** Replay from the recording. With a cursor, jump there silently and then play that act with timing. */
  const startReplay = useCallback((fromCursor = 0) => {
    abortRef.current?.abort();
    const p = createPlayer({
      events: golden.events, speed: 1, maxGapMs: 900,
      onState: (s) => { setState(s); setAtEnd(p.atEnd()); },
      onSegment: setSegment,
    });
    mount(p);
    if (fromCursor > 0) p.seek(fromCursor);
    p.next();
  }, [golden, mount]);

  const fallBack = useCallback((reason: string | null) => {
    setLiveError(reason);
    setMode("cached");
    startReplay(fallbackCursor(golden.events, receivedRef.current));
  }, [golden, startReplay]);

  const startLive = useCallback(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    receivedRef.current = [];
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
        for await (const ev of withInactivityTimeout(liveRun(slug, ac.signal), LIVE_INACTIVITY_MS)) {
          if (ac.signal.aborted) return;
          receivedRef.current.push(ev);
          p.push(ev);
        }
        if (!receivedRef.current.some((e) => e.type === "run.end")) throw new Error("live run ended early");
      } catch (e) {
        if (ac.signal.aborted) return;
        fallBack((e as Error).message);
      }
    })();
  }, [slug, mount, fallBack]);

  /** Presenter escape hatch: abandon the live run and continue from the recording at the current act. */
  const stopLive = useCallback(() => { fallBack(null); }, [fallBack]);

  useEffect(() => {
    startReplay(0);
    return () => { abortRef.current?.abort(); playerRef.current?.dispose(); playerRef.current = null; };
  }, [startReplay]);

  const next = useCallback(() => playerRef.current?.next(), []);
  const back = useCallback(() => playerRef.current?.back(), []);

  return { state, segment, atEnd, mode, liveError, next, back, startLive, stopLive };
}
