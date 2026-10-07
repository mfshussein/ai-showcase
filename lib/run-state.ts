import type { RunEvent, PanelKind, Slot } from "./events";

export interface PanelState { id: string; kind: PanelKind; slot: Slot; props: Record<string, unknown>; order: number }
export type ControlEvent = Extract<RunEvent, { type: "control.event" }>;
export interface RunState {
  demo?: string;
  mode?: "replay" | "live";
  act: number;
  actTitle: string;
  actSubtitle?: string;
  panels: PanelState[];
  controls: ControlEvent[];
  ended: boolean;
  usage?: { inputTokens: number; outputTokens: number; costUsd: number };
  seq: number;
}
export const initialRunState: RunState = { act: 0, actTitle: "", panels: [], controls: [], ended: false, seq: 0 };

function upsert(state: RunState, id: string, kind: PanelKind, slot: Slot, props: Record<string, unknown>): RunState {
  const i = state.panels.findIndex((p) => p.id === id);
  const seq = state.seq + 1;
  if (i === -1) return { ...state, seq, panels: [...state.panels, { id, kind, slot, props, order: seq }] };
  const panels = state.panels.slice();
  panels[i] = { ...panels[i], kind, slot, props };
  return { ...state, seq, panels };
}

export function reduceRun(state: RunState, ev: RunEvent): RunState {
  switch (ev.type) {
    case "run.start":
      return { ...initialRunState, demo: ev.demo, mode: ev.mode };
    case "act.start":
      return { ...state, act: ev.act, actTitle: ev.title, actSubtitle: ev.subtitle, panels: state.panels.filter((p) => ev.keep.includes(p.id)) };
    case "panel":
      return upsert(state, ev.id, ev.kind, ev.slot, ev.props);
    case "panel.patch": {
      const p = state.panels.find((x) => x.id === ev.id);
      if (!p) return state;
      return upsert(state, p.id, p.kind, p.slot, { ...p.props, ...ev.patch });
    }
    case "panel.remove":
      return state.panels.some((p) => p.id === ev.id) ? { ...state, panels: state.panels.filter((p) => p.id !== ev.id) } : state;
    case "text.delta": {
      const p = state.panels.find((x) => x.id === ev.id);
      const text = ((p?.props.text as string | undefined) ?? "") + ev.delta;
      return upsert(state, ev.id, p?.kind ?? "markdown", p?.slot ?? "main", { ...(p?.props ?? {}), text });
    }
    case "verdict":
      return upsert(state, ev.id, "verdict", "main", { status: ev.status, tone: ev.tone, headline: ev.headline, reason: ev.reason, evidence: ev.evidence });
    case "control.event":
      return { ...state, controls: [...state.controls, ev] };
    case "pause":
      return state;
    case "run.end":
      return { ...state, ended: true, usage: ev.usage };
  }
}

export function applyAll(events: RunEvent[]): RunState {
  return events.reduce(reduceRun, initialRunState);
}

export function segmentEvents(events: RunEvent[]): RunEvent[][] {
  const out: RunEvent[][] = [];
  let cur: RunEvent[] = [];
  for (const ev of events) {
    cur.push(ev);
    if (ev.type === "pause") { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}

export function actsInRun(events: RunEvent[]): { act: number; title: string }[] {
  return events.flatMap((e) => (e.type === "act.start" ? [{ act: e.act, title: e.title }] : []));
}

export function cursorForAct(events: RunEvent[], act: number): number {
  return events.findIndex((e) => e.type === "act.start" && e.act === act);
}
