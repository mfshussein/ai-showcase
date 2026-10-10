"use client";
import { Check, Target } from "lucide-react";
import type { DiscoveryState } from "@/discovery/engine";
import type { Flow, PainStatus } from "@/discovery/types";
import { strength } from "@/discovery/engine";
import { Panel, money } from "./bits";

const STATUSES: { id: PainStatus; label: string }[] = [
  { id: "symptom", label: "Symptom" },
  { id: "candidate", label: "Candidate" },
  { id: "confirmed", label: "Confirmed" },
];

function Ring({ value }: { value: number }) {
  const r = 26, c = 2 * Math.PI * r;
  const color = value >= 80 ? "var(--ok)" : value >= 45 ? "var(--accent)" : "var(--warn)";
  return (
    <div className="relative h-[68px] w-[68px] shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--line)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.2,0.7,0.2,1), stroke 300ms" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[15px] font-semibold">{value}%</span>
    </div>
  );
}

/** How well the pain point is identified: its status, its cost, and the checklist of what still has to be asked. */
export function DiagnosisPanel({ flow, state, className }: { flow: Flow; state: DiscoveryState; className?: string }) {
  const score = strength(flow, state);
  const statusIndex = STATUSES.findIndex((s) => s.id === state.pain.status);
  const groups = [...new Set(flow.checklist.map((c) => c.group))];
  const open = flow.checklist.filter((c) => !state.checks.includes(c.id));

  return (
    <Panel title="Pain-point diagnosis" icon={<Target size={15} />} className={className}
      right={<span className="font-mono text-xs text-muted">{state.checks.length}/{flow.checklist.length}</span>}>
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-4">
          <Ring value={score} />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted">Diagnosis strength</p>
            <p className="mt-0.5 text-[15px] font-semibold leading-snug">{state.pain.title ?? "Listening for the pain…"}</p>
            {open[0] && <p className="mt-1 text-xs text-muted">Next to cover: <span className="text-fg">{open[0].label.toLowerCase()}</span></p>}
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-1">
            {STATUSES.map((s, i) => (
              <div key={s.id} className={`h-1.5 rounded-full transition-colors duration-500 ${state.pain.title && i <= statusIndex ? (statusIndex === 2 ? "bg-ok" : "bg-accent") : "bg-line"}`} />
            ))}
          </div>
          <div className="mt-1 grid grid-cols-3 text-[11px] text-muted">
            {STATUSES.map((s, i) => <span key={s.id} className={`${i === 1 ? "text-center" : i === 2 ? "text-right" : ""} ${state.pain.title && i === statusIndex ? "font-semibold text-fg" : ""}`}>{s.label}</span>)}
          </div>
        </div>

        {state.pain.impact ? (
          <div className="verdict-enter rounded-md border border-ok/30 bg-ok/[0.06] px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-ok">Quantified impact · confidence {state.pain.impact.confidence}</p>
            <p className="mt-0.5 font-mono text-2xl font-semibold tracking-tight">{money(state.pain.impact.currency, state.pain.impact.total)}<span className="text-sm font-normal text-muted"> / year</span></p>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-line px-3 py-2.5 text-xs text-muted">
            Not yet quantified. Until it has a cost, a basis and a confidence, it stays a symptom (D3).
          </div>
        )}

        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{g}</p>
            <ul className="space-y-1">
              {flow.checklist.filter((c) => c.group === g).map((c) => {
                const done = state.checks.includes(c.id);
                return (
                  <li key={c.id} className="flex items-center gap-2.5 text-[13.5px]">
                    <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${done ? "check-pop border-ok bg-ok text-white" : "border-line bg-card"}`}>
                      {done && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className={done ? "text-fg" : "text-muted"}>{c.label}</span>
                    {c.rule && <span className="ml-auto font-mono text-[11px] text-muted">{c.rule}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}
