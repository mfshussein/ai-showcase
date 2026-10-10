/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef } from "react";
import { Check, Compass, Lightbulb, Paperclip, Send } from "lucide-react";
import type { DiscoveryState, Exchange } from "@/discovery/engine";
import type { Flow, Response } from "@/discovery/types";
import { TrackerShot, useDelayed } from "./bits";
import { ChoiceCard, EndCard, GatesCard, LadderCard, PillarsCard, RoiCard, UploadCard } from "./cards";

interface Props {
  flow: Flow;
  state: DiscoveryState;
  draft: Response | null;
  setDraft: (r: Response) => void;
  onRespond: (r: Response) => void;
}

function Typing() {
  return (
    <span className="inline-flex items-center gap-1 py-2" aria-label="Thinking">
      {[0, 1, 2].map((i) => <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 160}ms` }} />)}
    </span>
  );
}

function EngineTurn({ flow, state, ex, live, latest, draft, setDraft, onRespond }: Props & { ex: Exchange; live: boolean; latest: boolean }) {
  const step = flow.steps[ex.stepId];
  const ready = useDelayed(650, latest && !ex.response);
  const input = step.input;
  // Past exchanges render from their recorded answer; the live one renders from the editable draft.
  const r = live ? draft : ex.response;
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-white shadow-sm"><Compass size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted"><span className="font-medium text-fg">Discovery Engine</span> · Q{ex.q}</p>
        {!ready ? <Typing /> : (
          <div className="note-enter">
            <p className="mt-1 text-[16.5px] leading-relaxed">{step.ask}</p>
            <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-muted">
              <Lightbulb size={13} className="mt-[2px] shrink-0 text-warn" />
              <span>{step.method.rule && <span className="mr-1 rounded-sm bg-warn/10 px-1 font-mono text-[11px] text-warn">{step.method.rule}</span>}{step.method.text}</span>
            </p>
            {input.kind === "choice" && <ChoiceCard input={input} live={live} chosen={ex.response?.kind === "choice" ? ex.response.index : undefined} onPick={(index) => onRespond({ kind: "choice", index })} />}
            {input.kind === "upload" && live && <UploadCard input={input} onUpload={onRespond} />}
            {input.kind === "roi" && r?.kind === "roi" && <RoiCard step={step} input={input} values={r.values} live={live} onChange={(values) => setDraft({ kind: "roi", values })} onConfirm={() => onRespond(r)} />}
            {input.kind === "ladder" && r?.kind === "ladder" && <LadderCard input={input} solvable={r.solvable} live={live} onPick={(solvable) => setDraft({ kind: "ladder", solvable })} onConfirm={() => onRespond(r)} />}
            {input.kind === "pillars" && r?.kind === "pillars" && <PillarsCard input={input} verdicts={r.verdicts} live={live} onChange={(verdicts) => setDraft({ kind: "pillars", verdicts })} onConfirm={() => onRespond(r)} />}
            {input.kind === "gates" && r?.kind === "gates" && <GatesCard input={input} state={state} deferred={r.deferred} live={live}
              onDefer={(id) => setDraft({ kind: "gates", deferred: [...r.deferred, id] })} onConfirm={() => onRespond(r)} />}
            {input.kind === "end" && <EndCard flow={flow} state={state} />}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientTurn({ flow, ex }: { flow: Flow; ex: Exchange }) {
  const step = flow.steps[ex.stepId];
  const r = ex.response;
  if (!r) return null;
  if (r.kind === "roi" || r.kind === "ladder" || r.kind === "pillars" || r.kind === "gates") {
    const what = { roi: "Figures confirmed with the client", ladder: "Solvable layer marked", pillars: "Pillar verdicts recorded", gates: "Gate deferrals approved" }[r.kind];
    return (
      <p className="note-enter flex items-center justify-center gap-2 text-xs text-muted">
        <span className="h-px w-10 bg-line" /><Check size={13} className="text-ok" />{what} · Lead Consultant<span className="h-px w-10 bg-line" />
      </p>
    );
  }
  const text = r.kind === "text" ? r.text : r.kind === "choice" && step.input.kind === "choice" ? step.input.options[r.index].label : null;
  return (
    <div className="note-enter flex justify-end">
      <div className="max-w-[82%]">
        <p className="mb-1 text-right text-xs text-muted">{flow.engagement.interviewee}</p>
        {r.kind === "upload" ? (
          <div className="w-[420px] max-w-full rounded-lg rounded-tr-sm bg-fg p-2 text-white">
            {r.url ? <img src={r.url} alt={r.name} className="max-h-64 w-full rounded-md object-contain" /> : <TrackerShot />}
            <p className="mt-1.5 flex items-center gap-1.5 px-1 text-xs opacity-80"><Paperclip size={12} />{r.name}</p>
          </div>
        ) : (
          <p className="rounded-lg rounded-tr-sm bg-fg px-4 py-2.5 text-[15.5px] leading-relaxed text-white">{text}</p>
        )}
      </div>
    </div>
  );
}

export function Conversation(props: Props) {
  const { flow, state, draft, setDraft, onRespond } = props;
  const endRef = useRef<HTMLDivElement>(null);
  const last = state.exchanges.at(-1)!;
  const liveStep = !last.response && flow.steps[last.stepId].input.kind !== "end" ? flow.steps[last.stepId] : null;
  useEffect(() => {
    const t = setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 700);
    return () => clearTimeout(t);
  }, [state.exchanges.length, last.response]);

  const textLive = liveStep?.input.kind === "text" && draft?.kind === "text";
  const send = () => { if (draft?.kind === "text" && draft.text.trim()) onRespond({ kind: "text", text: draft.text.trim() }); };

  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-line bg-card shadow-[0_1px_2px_rgba(15,23,32,0.04)]">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <p className="mx-auto max-w-md rounded-md border border-dashed border-line px-4 py-2 text-center text-xs leading-relaxed text-muted">
          Interview with the {flow.engagement.interviewee}, {flow.engagement.client}. Answers are captured as findings; nothing becomes a pain point until it is quantified.
        </p>
        {state.exchanges.map((ex, i) => (
          <div key={`${ex.stepId}-${i}`} className="space-y-4">
            <EngineTurn {...props} ex={ex} live={liveStep?.id === ex.stepId && !ex.response} latest={i === state.exchanges.length - 1} />
            <ClientTurn flow={flow} ex={ex} />
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="shrink-0 border-t border-line p-3">
        {textLive ? (
          <div className="flex items-end gap-2 rounded-lg border border-line bg-bg/50 p-2 focus-within:border-accent">
            <div className="min-w-0 flex-1">
              <p className="px-1 text-[11px] uppercase tracking-wide text-muted">Client answer · scripted, edit freely</p>
              <textarea value={draft.text} rows={2} aria-label="Client answer"
                onChange={(e) => setDraft({ kind: "text", text: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                className="w-full resize-none bg-transparent px-1 text-[15px] leading-relaxed outline-none" />
            </div>
            <button type="button" onClick={send} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-semibold text-white hover:bg-[#1239b0]"><Send size={14} />Send</button>
          </div>
        ) : (
          <p className="px-2 py-2 text-sm text-muted">{liveStep ? "Answer with the card above, or press Next." : "Discovery complete. Reset to run it again."}</p>
        )}
      </div>
    </section>
  );
}
