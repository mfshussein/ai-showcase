import type { Effect, Flow, Gate, HypothesisStatus, PainStatus, Response, RoiLine, StageId, Stance, Step, Tag, Verdict } from "./types";

export interface Note { id: number; tag: Tag; text: string; q: number }
export interface Hypothesis { id: string; name: string; shape: string; status: HypothesisStatus; history: { status: HypothesisStatus; reason: string; q: number }[] }
export interface Obstacle { text: string; who: string; stance: Stance; influence: "H" | "M" | "L"; q: number }
export interface Impact { currency: string; lines: RoiLine[]; total: number; basis: string; confidence: string }
/** One question from the engine and, once given, the client's answer. */
export interface Exchange { stepId: string; q: number; response?: Response }
export type GateState = "satisfied" | "deferred" | "open";

export interface DiscoveryState {
  exchanges: Exchange[];
  notes: Note[];
  checks: string[];
  pain: { title?: string; status: PainStatus; impact?: Impact };
  hypotheses: Hypothesis[];
  obstacles: Obstacle[];
  stage: StageId;
  /** Stages the conversation has actually passed through; a skipped stage is never shown as done. */
  visited: StageId[];
  pillars: Record<string, Verdict>;
  deferred: string[];
}

export function initialState(flow: Flow): DiscoveryState {
  return {
    exchanges: [{ stepId: flow.start, q: 1 }],
    notes: [], checks: [], pain: { status: "symptom" }, hypotheses: [], obstacles: [],
    stage: "context", visited: ["setup", "context"], pillars: {}, deferred: [],
  };
}

/** The step awaiting an answer, or null once the flow has reached its end card. */
export function currentStep(flow: Flow, s: DiscoveryState): Step | null {
  const last = s.exchanges[s.exchanges.length - 1];
  const step = flow.steps[last.stepId];
  return !last.response && step.input.kind !== "end" ? step : null;
}

export function roiLines(step: Step, values: Record<string, number>): { lines: RoiLine[]; total: number } {
  if (step.input.kind !== "roi") throw new Error(`step ${step.id} is not a calculation`);
  const lines = step.input.compute(values);
  return { lines, total: lines.reduce((a, l) => a + l.value, 0) };
}

export function respond(flow: Flow, s: DiscoveryState, r: Response): DiscoveryState {
  const step = currentStep(flow, s);
  if (!step) throw new Error("the flow has ended");
  if (step.input.kind !== r.kind) throw new Error(`step ${step.id} expects ${step.input.kind}, got ${r.kind}`);
  const q = s.exchanges.length;
  let next = { ...s, exchanges: s.exchanges.map((e, i) => (i === q - 1 ? { ...e, response: r } : e)) };
  const effects: Effect[] = [...step.effects];
  let to = step.next;

  if (r.kind === "choice" && step.input.kind === "choice") {
    const opt = step.input.options[r.index];
    if (!opt) throw new Error(`step ${step.id} has no option ${r.index}`);
    effects.push(...opt.effects);
    to = opt.next;
  } else if (r.kind === "roi" && step.input.kind === "roi") {
    const { lines, total } = roiLines(step, r.values);
    next.pain = { ...next.pain, impact: { currency: step.input.currency, lines, total, basis: step.input.basis, confidence: step.input.confidence } };
    effects.push({ type: "note", tag: "pain", text: `Costs ${step.input.currency} ${Math.round(total).toLocaleString("en-US")} a year in staff time and missed discounts (confidence ${step.input.confidence}).` });
  } else if (r.kind === "ladder" && step.input.kind === "ladder") {
    const rungs = step.input.rungs;
    effects.push({ type: "note", tag: "root-cause", text: `${rungs[r.solvable].because} (solvable layer)` });
    // Anything deeper than the solvable layer is not the build target; it is recorded as an obstacle instead (D4).
    for (const rung of rungs.slice(r.solvable + 1)) {
      effects.push({ type: "note", tag: "obstacle", text: rung.because });
      effects.push({ type: "obstacle", text: rung.because, who: "Unassigned", stance: "unknown", influence: "M" });
    }
  } else if (r.kind === "pillars") {
    next.pillars = { ...r.verdicts };
  } else if (r.kind === "gates") {
    next.deferred = [...r.deferred];
    effects.push({ type: "stage", stage: "outputs" });
  }

  for (const e of effects) next = apply(next, e, q);
  if (to) {
    if (!flow.steps[to]) throw new Error(`step ${step.id} points to unknown step ${to}`);
    next.exchanges = [...next.exchanges, { stepId: to, q: q + 1 }];
  }
  return next;
}

function apply(s: DiscoveryState, e: Effect, q: number): DiscoveryState {
  switch (e.type) {
    case "note": return { ...s, notes: [...s.notes, { id: s.notes.length + 1, tag: e.tag, text: e.text, q }] };
    case "check": return s.checks.includes(e.id) ? s : { ...s, checks: [...s.checks, e.id] };
    case "pain": return { ...s, pain: { ...s.pain, ...(e.title ? { title: e.title } : {}), ...(e.status ? { status: e.status } : {}) } };
    case "stage": return { ...s, stage: e.stage, visited: s.visited.includes(e.stage) ? s.visited : [...s.visited, e.stage] };
    case "obstacle": return { ...s, obstacles: [...s.obstacles, { text: e.text, who: e.who, stance: e.stance, influence: e.influence, q }] };
    case "hypothesis": {
      const found = s.hypotheses.find((h) => h.id === e.id);
      const entry = { status: e.status, reason: e.reason, q };
      if (!found) return { ...s, hypotheses: [...s.hypotheses, { id: e.id, name: e.name ?? e.id, shape: e.shape ?? "Other", status: e.status, history: [entry] }] };
      return { ...s, hypotheses: s.hypotheses.map((h) => (h.id === e.id ? { ...h, status: e.status, history: [...h.history, entry] } : h)) };
    }
  }
}

/** How well the pain point has been diagnosed, 0 to 100, from the weighted checklist. */
export function strength(flow: Flow, s: DiscoveryState): number {
  const total = flow.checklist.reduce((a, c) => a + c.weight, 0);
  const got = flow.checklist.filter((c) => s.checks.includes(c.id)).reduce((a, c) => a + c.weight, 0);
  return total ? Math.round((got / total) * 100) : 0;
}

export function gateState(g: Gate, s: DiscoveryState, deferred: string[] = s.deferred): GateState {
  if (g.satisfiedBy && s.checks.includes(g.satisfiedBy)) return "satisfied";
  return deferred.includes(g.id) ? "deferred" : "open";
}

/** What the presenter's "Next" sends when nobody has touched the controls. */
export function defaultResponse(step: Step): Response {
  const i = step.input;
  switch (i.kind) {
    case "text": return { kind: "text", text: i.answer };
    case "choice": return { kind: "choice", index: i.suggested };
    case "upload": return { kind: "upload", name: i.file };
    case "roi": return { kind: "roi", values: Object.fromEntries(i.fields.map((f) => [f.id, f.value])) };
    case "ladder": return { kind: "ladder", solvable: i.solvable };
    case "pillars": return { kind: "pillars", verdicts: Object.fromEntries(i.pillars.map((p) => [p.id, p.verdict])) };
    case "gates": return { kind: "gates", deferred: i.gates.filter((g) => !g.satisfiedBy).map((g) => g.id) };
    case "end": throw new Error("the end card takes no answer");
  }
}
