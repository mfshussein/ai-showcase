"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, RotateCcw } from "lucide-react";
import { currentStep, defaultResponse, gateState, initialState, respond, type DiscoveryState } from "@/discovery/engine";
import type { Response, Step } from "@/discovery/types";
import { flows } from "@/discovery/flows";
import { stageKeyAction } from "@/lib/stage-keys";
import { Brand } from "@/components/brand";
import { SummaryPanel } from "./summary-panel";
import { DiagnosisPanel } from "./diagnosis-panel";
import { Conversation } from "./conversation";
import { Rail } from "./rail";

/** The editable answer a live card starts from. Gates start with nothing deferred, so the block is visible before it is lifted. */
function initialDraft(step: Step | null): Response | null {
  if (!step || step.input.kind === "choice" || step.input.kind === "upload") return null;
  if (step.input.kind === "gates") return { kind: "gates", deferred: [] };
  return defaultResponse(step);
}

export function DiscoveryRoom({ slug }: { slug: string }) {
  const flow = flows[slug];
  const router = useRouter();
  const [state, setState] = useState<DiscoveryState>(() => initialState(flow));
  const step = currentStep(flow, state);
  const key = String(state.exchanges.length);
  const [drafted, setDrafted] = useState<{ key: string; r: Response | null }>({ key: "", r: null });
  const draft = drafted.key === key ? drafted.r : initialDraft(step);
  const setDraft = (r: Response) => setDrafted({ key, r });
  // Ignore Next while the engine is still "typing" the question it just asked.
  const askedAt = useRef(0);

  const answer = (r: Response) => {
    setState((s) => respond(flow, s, r));
    askedAt.current = Date.now();
  };

  const advance = () => {
    if (!step || Date.now() - askedAt.current < 700) return;
    const i = step.input;
    if (i.kind === "gates" && draft?.kind === "gates") {
      const blocking = i.gates.find((g) => g.hard && gateState(g, state, draft.deferred) === "open");
      if (blocking) { setDraft({ kind: "gates", deferred: [...draft.deferred, blocking.id] }); return; }
    }
    answer(draft ?? defaultResponse(step));
  };

  const reset = () => { setState(initialState(flow)); askedAt.current = 0; };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target instanceof Element ? e.target.tagName : "BODY";
    if (step?.input.kind === "choice" && /^[1-9]$/.test(e.key) && target !== "TEXTAREA" && target !== "INPUT") {
      const n = Number(e.key) - 1;
      if (n < step.input.options.length) { e.preventDefault(); answer({ kind: "choice", index: n }); }
      return;
    }
    const action = stageKeyAction({ key: e.key, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey, repeat: e.repeat, targetTag: target });
    if (action === "next") { e.preventDefault(); advance(); }
    else if (action === "escape") router.push("/");
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const stageIndex = flow.stages.findIndex((s) => s.id === state.stage);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="shrink-0 border-b border-line bg-card px-5 pt-3">
        <div className="flex items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-5">
            <Brand sub="Discovery Engine" />
            <span className="hidden h-5 w-px bg-line md:block" />
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-[15px] font-semibold leading-tight">{flow.engagement.client}</p>
              <p className="truncate text-xs text-muted">{flow.engagement.scope}</p>
            </div>
            <span className="hidden rounded-sm border border-line px-1.5 py-0.5 text-xs text-muted lg:inline">{flow.engagement.profile}</span>
            <span className="hidden rounded-sm border border-accent/40 bg-accent/[0.06] px-1.5 py-0.5 text-xs font-medium text-accent lg:inline">Target stage: {flow.engagement.stage}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <span className="rounded-sm border border-line px-2 py-0.5 font-mono text-xs text-muted" title="Questions and answers come from a configured flow. The AI-driven version uses the same screens.">SCRIPTED</span>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={reset} className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 hover:border-fg"><RotateCcw size={14} />Reset</button>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={advance} disabled={!step}
              className="inline-flex items-center gap-1.5 rounded-md bg-fg px-4 py-1.5 font-semibold text-white hover:bg-black disabled:opacity-40">
              Next<ArrowRight size={15} />
            </button>
          </div>
        </div>
        <ol className="mt-3 flex overflow-x-auto" aria-label="Engagement stages">
          {flow.stages.map((s, i) => {
            const now = i === stageIndex, done = !now && state.visited.includes(s.id), skipped = !now && !done && i < stageIndex;
            return (
              <li key={s.id} title={skipped ? "Not needed in this engagement" : undefined}
                className={`flex min-w-[96px] flex-1 items-center gap-2 border-b-2 px-1 pb-2 text-xs transition-colors duration-500 ${now ? "border-accent font-semibold text-fg" : done ? "border-ok/60 text-fg" : skipped ? "border-line text-muted line-through" : "border-transparent text-muted"}`}
                aria-current={now ? "step" : undefined}>
                <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full font-mono text-[10px] ${now ? "bg-accent text-white" : done ? "bg-ok text-white" : "border border-line"}`}>
                  {done ? <Check size={11} strokeWidth={3} /> : skipped ? "–" : i + 1}
                </span>
                <span className="truncate">{s.label}</span>
              </li>
            );
          })}
        </ol>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(320px,360px)_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_290px]">
        <div className="hidden min-h-0 grid-rows-[minmax(0,5fr)_minmax(0,6fr)] gap-4 lg:grid">
          <SummaryPanel notes={state.notes} />
          <DiagnosisPanel flow={flow} state={state} />
        </div>
        <Conversation flow={flow} state={state} draft={draft} setDraft={setDraft} onRespond={answer} />
        <div className="hidden min-h-0 xl:flex"><Rail flow={flow} state={state} /></div>
      </main>
    </div>
  );
}
