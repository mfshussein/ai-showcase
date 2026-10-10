"use client";
import { Layers, Lightbulb, Users } from "lucide-react";
import type { DiscoveryState } from "@/discovery/engine";
import type { Flow, HypothesisStatus, Verdict } from "@/discovery/types";
import { Panel } from "./bits";

const HYP: Record<HypothesisStatus, string> = {
  open: "border-line bg-bg text-muted",
  strengthened: "border-ok/30 bg-ok/10 text-ok",
  killed: "border-block/30 bg-block/10 text-block line-through",
  selected: "border-accent/30 bg-accent/10 text-accent",
};
const PILLAR: Record<Verdict, string> = { core: "bg-accent text-white", deferred: "bg-warn text-white", na: "bg-muted/60 text-white" };
const STANCE = { champion: "text-ok", neutral: "text-muted", resistant: "text-block", unknown: "text-muted" } as const;

/** The three streams stay separate (D2), hypotheses keep their history (D5), and every pillar shows its verdict (D6). */
export function Rail({ flow, state }: { flow: Flow; state: DiscoveryState }) {
  const streams = [
    { label: "Pain points", n: state.pain.title ? 1 : 0, cls: "text-block" },
    { label: "Root causes", n: state.notes.filter((n) => n.tag === "root-cause").length, cls: "text-quarantine" },
    { label: "Obstacles", n: state.obstacles.length, cls: "text-fg" },
  ];
  const pillarStep = Object.values(flow.steps).find((s) => s.input.kind === "pillars");
  const pillars = pillarStep?.input.kind === "pillars" ? pillarStep.input.pillars : [];
  const visited = pillars.filter((p) => state.pillars[p.id]).length;

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
        {streams.map((s) => (
          <div key={s.label} className="bg-card px-3 py-2.5">
            <p className={`font-mono text-2xl font-semibold ${s.cls}`}>{s.n}</p>
            <p className="text-[11px] leading-tight text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <Panel title="Hypotheses" icon={<Lightbulb size={15} />} className="shrink-0" bodyClass="overflow-visible">
        {state.hypotheses.length === 0 ? <p className="px-4 py-3 text-xs text-muted">Solution shapes are recorded during discovery, not after.</p> : (
          <ul className="divide-y divide-line">
            {state.hypotheses.map((h) => (
              <li key={h.id} className="note-enter px-4 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-[13px] font-medium leading-snug ${h.status === "killed" ? "text-muted line-through" : ""}`}>{h.name}</p>
                  <span className={`shrink-0 rounded-sm border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${HYP[h.status]}`}>{h.status}</span>
                </div>
                <p className="text-[11px] text-muted">{h.shape}</p>
                <p className="mt-1 text-xs leading-snug text-muted"><span className="font-mono">Q{h.history.at(-1)!.q}</span> {h.history.at(-1)!.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Stakeholders and obstacles" icon={<Users size={15} />} className="shrink-0" bodyClass="overflow-visible">
        {state.obstacles.length === 0 ? <p className="px-4 py-3 text-xs text-muted">Nobody named yet.</p> : (
          <ul className="divide-y divide-line">
            {state.obstacles.map((o, i) => (
              <li key={i} className="note-enter px-4 py-2">
                <p className="text-[13px] leading-snug">{o.text}</p>
                <p className="mt-0.5 text-[11px] text-muted">{o.who} · <span className={STANCE[o.stance]}>{o.stance}</span> · influence {o.influence}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Pillar coverage" icon={<Layers size={15} />} className="shrink-0" bodyClass="overflow-visible"
        right={<span className="font-mono text-xs text-muted">{visited}/{pillars.length}</span>}>
        <div className="grid grid-cols-5 gap-1.5 p-4">
          {pillars.map((p) => {
            const v = state.pillars[p.id];
            return (
              <span key={p.id} title={`${p.name}: ${v ?? "not visited"}`}
                className={`flex h-8 items-center justify-center rounded font-mono text-[11px] transition-colors duration-500 ${v ? PILLAR[v] : "border border-dashed border-line text-muted"}`}>{p.id}</span>
            );
          })}
        </div>
        <div className="flex gap-3 px-4 pb-3 text-[11px] text-muted">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-accent" />Core</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-warn" />Deferred</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted/60" />N/A</span>
        </div>
      </Panel>
    </div>
  );
}
