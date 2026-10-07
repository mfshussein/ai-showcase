"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DemoManifest } from "@/demos/types";
import type { GoldenRun } from "@/lib/events";
import { actsInRun, initialRunState, type RunState } from "@/lib/run-state";
import { createPlayer, type Player } from "@/lib/player";
import { Brand } from "@/components/brand";
import { ActStrip } from "./act-strip";
import { PanelHost } from "./panel-host";
import { EvidenceDrawer } from "./evidence-drawer";

export function Stage({ manifest, golden, presenter, walk, nextSlug }: {
  manifest: DemoManifest; golden: GoldenRun; presenter: boolean; walk: boolean; nextSlug?: string;
}) {
  const router = useRouter();
  const playerRef = useRef<Player | null>(null);
  const [state, setState] = useState<RunState>(initialRunState);
  const [segment, setSegment] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const [evidence, setEvidence] = useState(false);
  const acts = actsInRun(golden.events);

  useEffect(() => {
    const p = createPlayer({
      events: golden.events, speed: 1, maxGapMs: 900,
      onState: (s) => { setState(s); setAtEnd(p.atEnd()); },
      onSegment: setSegment,
    });
    playerRef.current = p;
    p.next();
    return () => { p.dispose(); playerRef.current = null; };
  }, [golden]);

  const next = useCallback(() => playerRef.current?.next(), []);
  const back = useCallback(() => playerRef.current?.back(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); back(); }
      else if (e.key === "e" || e.key === "E") setEvidence((v) => !v);
      else if (e.key === "Escape") { if (evidence) setEvidence(false); else router.push("/"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, evidence, router]);

  const actIndex = Math.max(0, acts.findIndex((a) => a.act === state.act));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-card px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Brand sub="" />
            <h1 className="text-lg font-semibold tracking-tight">{manifest.title}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-sm border border-line px-2 py-0.5 font-mono text-muted">{state.mode === "live" ? "LIVE" : "REPLAY"}</span>
            <button type="button" onClick={() => setEvidence((v) => !v)} className="rounded-md border border-line px-3 py-1 hover:border-fg">
              Evidence{state.controls.length ? ` (${state.controls.length})` : ""}
            </button>
            {presenter && <span className="text-muted">Presenter</span>}
          </div>
        </div>
        <div className="mx-auto mt-3 max-w-7xl"><ActStrip acts={acts} current={state.act} /></div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        {state.act > 0 && (
          <div className="mb-5 flex items-baseline gap-4">
            <h2 className="text-3xl font-semibold tracking-tight">{state.actTitle}</h2>
            {state.actSubtitle && <p className="text-lg text-muted">{state.actSubtitle}</p>}
          </div>
        )}
        <PanelHost panels={state.panels} />
        {atEnd && (
          <section className="mt-6 rounded-md border border-line bg-card p-6">
            <p className="text-xl leading-snug">{manifest.takeaway}</p>
            <div className="mt-4 flex gap-3">
              {walk && nextSlug ? (
                <Link href={`/demo/${nextSlug}?walk=1`} className="rounded-md bg-accent px-4 py-2 font-semibold text-white hover:bg-[#1239b0]">Next case</Link>
              ) : null}
              <Link href="/" className="rounded-md border border-line px-4 py-2 hover:border-fg">Back to all cases</Link>
            </div>
          </section>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-line bg-card/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p className="text-sm text-muted">Act {actIndex + 1} of {acts.length}. Space continues, arrow keys move, E opens evidence.</p>
          <div className="flex gap-2">
            <button type="button" onClick={back} disabled={segment === 0 && state.act <= 1} className="rounded-md border border-line px-4 py-2 disabled:opacity-40 hover:border-fg">Back</button>
            <button type="button" onClick={next} disabled={atEnd} className="rounded-md bg-fg px-5 py-2 font-semibold text-white disabled:opacity-40 hover:bg-black">Next</button>
          </div>
        </div>
      </footer>

      <EvidenceDrawer open={evidence} onClose={() => setEvidence(false)} state={state} model={golden.model} mode={state.mode ?? "replay"} />
    </div>
  );
}
