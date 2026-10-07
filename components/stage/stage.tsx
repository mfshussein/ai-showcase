"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DemoManifest } from "@/demos/types";
import type { GoldenRun } from "@/lib/events";
import { actsInRun } from "@/lib/run-state";
import { useStagePlayer } from "@/lib/use-stage-player";
import { stageKeyAction } from "@/lib/stage-keys";
import { Brand } from "@/components/brand";
import { ActStrip } from "./act-strip";
import { PanelHost } from "./panel-host";
import { EvidenceDrawer } from "./evidence-drawer";
import { stageExtras } from "@/lib/stage-extras";

const NO_CONTROLS: never[] = [];

export function Stage({ manifest, golden, presenter, walk, nextSlug }: {
  manifest: DemoManifest; golden: GoldenRun; presenter: boolean; walk: boolean; nextSlug?: string;
}) {
  const router = useRouter();
  const [evidence, setEvidence] = useState(false);
  const acts = actsInRun(golden.events);
  // Evidence records added by the stage itself (for example, whether the alert email was sent) sit beside the run's own.
  const extraControls = useSyncExternalStore(stageExtras.subscribe, stageExtras.getControls, () => NO_CONTROLS);
  useEffect(() => { stageExtras.reset(); }, [manifest.slug]);
  const { state, segment, atEnd, mode, liveError, next, back, startLive, stopLive } = useStagePlayer(manifest.slug, golden);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = stageKeyAction({
        key: e.key, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey, repeat: e.repeat,
        targetTag: e.target instanceof Element ? e.target.tagName : "BODY",
      });
      if (!action) return;
      e.preventDefault();
      if (action === "next") next();
      else if (action === "back") back();
      else if (action === "evidence") setEvidence((v) => !v);
      else if (action === "live") { if (!presenter) return; if (mode === "live") stopLive(); else startLive(); }
      else if (action === "escape") { if (evidence) setEvidence(false); else router.push("/"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, evidence, router, presenter, mode, startLive, stopLive]);

  const actIndex = Math.max(0, acts.findIndex((a) => a.act === state.act));
  const evidenceState = extraControls.length ? { ...state, controls: [...state.controls, ...extraControls] } : state;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-card px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Brand sub="" />
            <h1 className="text-lg font-semibold tracking-tight">{manifest.title}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className={`rounded-sm border px-2 py-0.5 font-mono ${mode === "live" ? "border-ok text-ok" : mode === "cached" ? "border-warn text-warn" : "border-line text-muted"}`} title={liveError ?? undefined}>
              {mode === "live" ? "LIVE" : mode === "cached" ? "CACHED" : "REPLAY"}
            </span>
            {presenter && (
              mode === "live"
                ? <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={stopLive} className="rounded-md border border-line px-3 py-1 hover:border-fg">Stop live</button>
                : <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={startLive} className="rounded-md border border-line px-3 py-1 hover:border-fg">Run live</button>
            )}
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setEvidence((v) => !v)} className="rounded-md border border-line px-3 py-1 hover:border-fg">
              Evidence{evidenceState.controls.length ? ` (${evidenceState.controls.length})` : ""}
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
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={back} disabled={segment <= 1} className="rounded-md border border-line px-4 py-2 disabled:opacity-40 hover:border-fg">Back</button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={next} disabled={atEnd} className="rounded-md bg-fg px-5 py-2 font-semibold text-white disabled:opacity-40 hover:bg-black">Next</button>
          </div>
        </div>
      </footer>

      <EvidenceDrawer open={evidence} onClose={() => setEvidence(false)} state={evidenceState} model={golden.model} mode={mode} />
    </div>
  );
}
