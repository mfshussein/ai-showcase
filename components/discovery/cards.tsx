"use client";
import { useRef } from "react";
import { Calculator, Check, FileJson, GitFork, ImageIcon, Lock, ShieldCheck, Upload } from "lucide-react";
import type { DiscoveryState } from "@/discovery/engine";
import { gateState, roiLines } from "@/discovery/engine";
import type { Flow, Input, Response, Step, Verdict } from "@/discovery/types";
import { money } from "./bits";

type In<K extends Input["kind"]> = Extract<Input, { kind: K }>;
type Res<K extends Response["kind"]> = Extract<Response, { kind: K }>;

const btn = "inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1239b0] disabled:cursor-not-allowed disabled:bg-muted/40";

function CardShell({ icon, title, right, children }: { icon: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-line bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-bg/60 px-4 py-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">{icon}{title}</p>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function ChoiceCard({ input, chosen, live, onPick }: { input: In<"choice">; chosen?: number; live: boolean; onPick: (i: number) => void }) {
  return (
    <CardShell icon={<GitFork size={13} />} title="Branch point" right={<span className="text-xs text-muted">The answer picks the next question</span>}>
      <div className="grid gap-2 sm:grid-cols-3">
        {input.options.map((o, i) => {
          const picked = chosen === i;
          return (
            <button key={o.label} type="button" disabled={!live} onClick={() => onPick(i)}
              className={`group flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition ${picked ? "border-accent bg-accent/[0.06]" : live ? "border-line hover:border-accent hover:bg-accent/[0.03]" : "border-line opacity-45"}`}>
              <span className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] ${picked ? "bg-accent text-white" : "bg-bg text-muted group-hover:text-accent"}`}>{i + 1}</span>
              <span>
                <span className="block text-sm font-medium leading-snug">{o.label}</span>
                {o.detail && <span className="block text-xs text-muted">{o.detail}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </CardShell>
  );
}

export function UploadCard({ input, onUpload }: { input: In<"upload">; onUpload: (r: Res<"upload">) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <CardShell icon={<ImageIcon size={13} />} title="Evidence requested">
      <div className="flex flex-col items-center gap-3 rounded-md border-2 border-dashed border-line bg-bg/50 px-4 py-6 text-center">
        <Upload size={22} className="text-muted" />
        <p className="text-sm text-muted">Drop a screenshot here, or attach one. It is linked to this pain point as evidence.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" className={btn} onClick={() => onUpload({ kind: "upload", name: input.file })}>
            <ImageIcon size={15} />Use the client&apos;s screenshot
          </button>
          <button type="button" onClick={() => ref.current?.click()} className="rounded-md border border-line bg-card px-4 py-2 text-sm hover:border-fg">Choose a file…</button>
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload({ kind: "upload", name: f.name, url: URL.createObjectURL(f) });
          }} />
        </div>
      </div>
    </CardShell>
  );
}

export function RoiCard({ step, input, values, live, onChange, onConfirm }: {
  step: Step; input: In<"roi">; values: Record<string, number>; live: boolean; onChange: (v: Record<string, number>) => void; onConfirm: () => void;
}) {
  const { lines, total } = roiLines(step, values);
  return (
    <CardShell icon={<Calculator size={13} />} title="Impact calculation" right={<span className="text-xs text-muted">Client figures · workings shown</span>}>
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {input.fields.map((f) => (
          <label key={f.id} className="flex items-center gap-2 text-[13px]">
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate" title={f.label}>{f.label}</span>
              <span className="block text-[10.5px] uppercase tracking-wide text-muted">Source: {f.source}</span>
            </span>
            <span className="flex items-center rounded-md border border-line bg-card focus-within:border-accent">
              <input type="number" value={values[f.id]} disabled={!live} aria-label={f.label}
                onChange={(e) => onChange({ ...values, [f.id]: Number(e.target.value) || 0 })}
                className="w-[84px] bg-transparent px-2 py-1 text-right font-mono text-[13px] outline-none disabled:text-fg" />
              <span className="border-l border-line px-1.5 py-1 font-mono text-[11px] text-muted">{f.unit}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4 space-y-1.5 border-t border-line pt-3">
        {lines.map((l) => (
          <div key={l.label} className="flex items-baseline gap-3 text-[13px]">
            <span className="w-32 shrink-0 font-medium">{l.label}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-muted">{l.working}</span>
            <span className="font-mono">{money(input.currency, l.value)}</span>
          </div>
        ))}
        <div className="flex items-baseline justify-between border-t border-line pt-2">
          <span className="text-sm font-semibold">Cost of the pain, per year</span>
          <span className="font-mono text-xl font-semibold text-block">{money(input.currency, total)}</span>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted"><span className="font-medium text-fg">Basis:</span> {input.basis} <span className="font-medium text-fg">Confidence:</span> {input.confidence}.</p>
      {live && <div className="mt-3 flex justify-end"><button type="button" className={btn} onClick={onConfirm}><Check size={15} />Confirm figures</button></div>}
    </CardShell>
  );
}

export function LadderCard({ input, solvable, live, onPick, onConfirm }: { input: In<"ladder">; solvable: number; live: boolean; onPick: (i: number) => void; onConfirm: () => void }) {
  return (
    <CardShell icon={<span className="font-mono text-[11px]">5×</span>} title="Why-ladder" right={<span className="text-xs text-muted">{live ? "Click a rung to mark the solvable layer" : "Solvable layer marked"}</span>}>
      <ol className="relative space-y-2 before:absolute before:bottom-4 before:left-[13px] before:top-4 before:w-px before:bg-line">
        {input.rungs.map((r, i) => {
          const isSolvable = i === solvable, below = i > solvable;
          return (
            <li key={i} className="note-enter relative" style={live ? { animationDelay: `${i * 380}ms` } : undefined}>
              <button type="button" disabled={!live} onClick={() => onPick(i)}
                className={`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition ${isSolvable ? "border-quarantine bg-quarantine/[0.06] ring-1 ring-quarantine/30" : below ? "border-line bg-bg/60" : "border-line bg-card"} ${live ? "hover:border-quarantine/60" : ""}`}>
                <span className={`relative z-10 -ml-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${isSolvable ? "bg-quarantine text-white" : below ? "bg-fg text-white" : "bg-bg text-muted ring-1 ring-line"}`}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted">{r.why}</span>
                  <span className={`block text-[14px] leading-snug ${below ? "text-muted" : ""}`}>{r.because}</span>
                  {r.obstacle && !below && live && <span className="mt-1 block text-[11px] text-warn">Budget and ownership: this looks like an obstacle, not a build target.</span>}
                </span>
                {isSolvable && <span className="shrink-0 rounded-sm bg-quarantine px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Solvable layer</span>}
                {below && <span className="shrink-0 rounded-sm bg-fg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Obstacle</span>}
              </button>
            </li>
          );
        })}
      </ol>
      {live && <div className="mt-3 flex justify-end"><button type="button" className={btn} onClick={onConfirm}><Check size={15} />Mark layer {solvable + 1} as the build target</button></div>}
    </CardShell>
  );
}

const VERDICTS: { id: Verdict; label: string; on: string }[] = [
  { id: "core", label: "Core", on: "bg-accent text-white" },
  { id: "deferred", label: "Deferred", on: "bg-warn text-white" },
  { id: "na", label: "N/A", on: "bg-muted text-white" },
];

export function PillarsCard({ input, verdicts, live, onChange, onConfirm }: { input: In<"pillars">; verdicts: Record<string, Verdict>; live: boolean; onChange: (v: Record<string, Verdict>) => void; onConfirm: () => void }) {
  const count = (v: Verdict) => Object.values(verdicts).filter((x) => x === v).length;
  return (
    <CardShell icon={<ShieldCheck size={13} />} title="Pillar sweep"
      right={<span className="font-mono text-xs text-muted">{count("core")} core · {count("deferred")} deferred · {count("na")} n/a</span>}>
      <div className="grid gap-x-5 gap-y-1 lg:grid-cols-2">
        {input.pillars.map((p) => (
          <div key={p.id} className="flex items-center gap-2 py-0.5">
            <span className="w-7 shrink-0 font-mono text-[11px] text-muted">{p.id}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium leading-tight">{p.name}</span>
              <span className="block truncate text-[11px] text-muted">{p.reason}</span>
            </span>
            <span className="flex shrink-0 overflow-hidden rounded border border-line" role="radiogroup" aria-label={p.name}>
              {VERDICTS.map((v) => (
                <button key={v.id} type="button" role="radio" aria-checked={verdicts[p.id] === v.id} disabled={!live}
                  onClick={() => onChange({ ...verdicts, [p.id]: v.id })}
                  className={`px-1.5 py-0.5 text-[10.5px] font-medium transition ${verdicts[p.id] === v.id ? v.on : "bg-card text-muted"} ${live && verdicts[p.id] !== v.id ? "hover:bg-bg" : ""}`}>{v.label}</button>
              ))}
            </span>
          </div>
        ))}
      </div>
      {live && <div className="mt-3 flex justify-end"><button type="button" className={btn} onClick={onConfirm}><Check size={15} />Confirm {input.pillars.length} verdicts</button></div>}
    </CardShell>
  );
}

export function GatesCard({ input, state, deferred, live, onDefer, onConfirm }: { input: In<"gates">; state: DiscoveryState; deferred: string[]; live: boolean; onDefer: (id: string) => void; onConfirm: () => void }) {
  const rows = input.gates.map((g) => ({ g, st: gateState(g, state, deferred) }));
  const blocking = rows.filter((r) => r.g.hard && r.st === "open");
  return (
    <CardShell icon={<Lock size={13} />} title={`${input.stage} gates`}
      right={<span className="font-mono text-xs text-muted">{rows.filter((r) => r.st === "satisfied").length} satisfied · {rows.filter((r) => r.st === "deferred").length} deferred · {rows.filter((r) => r.st === "open").length} open</span>}>
      <ul className="space-y-1.5">
        {rows.map(({ g, st }) => (
          <li key={g.id} className={`rounded-md border px-3 py-2 ${st === "open" && g.hard ? "border-block/40 bg-block/[0.04]" : st === "deferred" ? "border-warn/40 bg-warn/[0.05]" : "border-line"}`}>
            <div className="flex items-center gap-2.5">
              <span className="w-8 shrink-0 font-mono text-[11px] text-muted">{g.id}</span>
              <span className="min-w-0 flex-1 text-[13px]">{g.label}</span>
              <span className={`shrink-0 rounded-sm px-1 font-mono text-[10px] ${g.hard ? "bg-fg text-white" : "bg-bg text-muted"}`} title={g.hard ? "Hard gate" : "Soft gate"}>{g.hard ? "H" : "S"}</span>
              {st === "satisfied" && <span className="flex w-[78px] shrink-0 items-center justify-end gap-1 text-xs font-medium text-ok"><Check size={13} />Satisfied</span>}
              {st === "deferred" && <span className="w-[78px] shrink-0 text-right text-xs font-medium text-warn">Deferred</span>}
              {st === "open" && (live
                ? <button type="button" onClick={() => onDefer(g.id)} className="w-[78px] shrink-0 rounded border border-line bg-card px-2 py-0.5 text-xs hover:border-fg">Defer…</button>
                : <span className="w-[78px] shrink-0 text-right text-xs font-medium text-block">Open</span>)}
            </div>
            {st === "deferred" && (
              <p className="note-enter mt-1 pl-[42px] text-xs leading-snug text-muted">{g.deferReason} <span className="text-fg">Target: {g.deferTo}.</span> Approved by Lead Consultant.</p>
            )}
          </li>
        ))}
      </ul>
      {live && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          {blocking.length
            ? <p className="flex items-center gap-2 text-xs text-block"><Lock size={13} />Blocked by {blocking.map((b) => b.g.id).join(", ")}. Satisfy or defer each with a reason.</p>
            : <p className="flex items-center gap-2 text-xs text-ok"><Check size={13} />No hard gate is open. Deferrals will be listed in the spec.</p>}
          <button type="button" className={btn} disabled={blocking.length > 0} onClick={onConfirm}><FileJson size={15} />Generate discovery summary</button>
        </div>
      )}
    </CardShell>
  );
}

export function EndCard({ flow, state }: { flow: Flow; state: DiscoveryState }) {
  const root = state.notes.find((n) => n.tag === "root-cause")?.text.replace(" (solvable layer)", "");
  const lead = [...state.hypotheses].sort((a, b) => rank(b.status) - rank(a.status))[0];
  const download = () => {
    const blob = new Blob([JSON.stringify({ engagement: flow.engagement, pain: state.pain, notes: state.notes, hypotheses: state.hypotheses, obstacles: state.obstacles, pillars: state.pillars, deferredGates: state.deferred }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${flow.slug}-discovery.json`;
    a.click();
  };
  const stats = [
    { k: "Quantified pain", v: state.pain.impact ? `${money(state.pain.impact.currency, state.pain.impact.total)} / yr` : "Not quantified", tone: "text-block" },
    { k: "Root cause (solvable layer)", v: root ?? "Not marked", tone: "text-quarantine" },
    { k: "Leading hypothesis", v: lead ? `${lead.name} (${lead.shape})` : "None", tone: "text-accent" },
    { k: "Obstacles and deferred gates", v: `${state.obstacles.length} obstacles · ${state.deferred.length} gates deferred`, tone: "text-fg" },
  ];
  return (
    <div className="verdict-enter mt-3 overflow-hidden rounded-lg border border-ok/40 bg-card">
      <div className="flex items-center gap-2 border-b border-ok/30 bg-ok/[0.07] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ok"><Check size={14} />Discovery summary</div>
      <div className="grid gap-px bg-line sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.k} className="bg-card px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-muted">{s.k}</p>
            <p className={`mt-1 text-[14px] font-semibold leading-snug ${s.tone}`}>{s.v}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        {["Discovery report", "Solution spec (draft)", "Risk register", "Opportunity report"].map((o) => (
          <span key={o} className="rounded-full border border-line bg-bg px-2.5 py-1 text-xs">{o}</span>
        ))}
        <button type="button" onClick={download} className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:border-fg"><FileJson size={14} />Download JSON</button>
      </div>
    </div>
  );
}

function rank(s: string) { return s === "selected" ? 3 : s === "strengthened" ? 2 : s === "open" ? 1 : 0; }
