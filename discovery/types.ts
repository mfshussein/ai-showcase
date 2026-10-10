/** The discovery flow is data: the screens render whatever a flow declares, so a scripted flow today can be replaced by an AI-driven one later. */

export type Tag = "symptom" | "pain" | "root-cause" | "obstacle" | "fact" | "quote" | "evidence";
export type PainStatus = "symptom" | "candidate" | "confirmed";
export type HypothesisStatus = "open" | "strengthened" | "killed" | "selected";
export type Verdict = "core" | "deferred" | "na";
export type Stance = "champion" | "neutral" | "resistant" | "unknown";
export type StageId = "setup" | "context" | "pain" | "diagnosis" | "hypotheses" | "pillars" | "prioritise" | "solution" | "gates" | "outputs";

export type Effect =
  | { type: "note"; tag: Tag; text: string }
  | { type: "check"; id: string }
  | { type: "pain"; title?: string; status?: PainStatus }
  | { type: "hypothesis"; id: string; name?: string; shape?: string; status: HypothesisStatus; reason: string }
  | { type: "obstacle"; text: string; who: string; stance: Stance; influence: "H" | "M" | "L" }
  | { type: "stage"; stage: StageId };

export interface ChoiceOption { label: string; detail?: string; next: string; effects: Effect[] }
export interface RoiField { id: string; label: string; value: number; unit: string; source: string }
export interface RoiLine { label: string; working: string; value: number }
export interface LadderRung { why: string; because: string; obstacle?: boolean }
export interface PillarDefault { id: string; name: string; verdict: Verdict; reason: string }
export interface Gate { id: string; label: string; hard: boolean; satisfiedBy?: string; deferReason: string; deferTo: string }

export type Input =
  | { kind: "text"; answer: string }
  | { kind: "choice"; options: ChoiceOption[]; suggested: number }
  | { kind: "upload"; file: string; caption: string }
  | { kind: "roi"; currency: string; fields: RoiField[]; compute: (v: Record<string, number>) => RoiLine[]; basis: string; confidence: "High" | "Medium" | "Low" }
  | { kind: "ladder"; rungs: LadderRung[]; solvable: number }
  | { kind: "pillars"; pillars: PillarDefault[] }
  | { kind: "gates"; stage: "POC" | "MVP" | "Production"; gates: Gate[] }
  | { kind: "end" };

export interface Step {
  id: string;
  ask: string;
  /** The consultant's reason for asking, shown under the question: this is the method on display. */
  method: { rule?: string; text: string };
  input: Input;
  /** Applied when the client answers, before any effects of the chosen option. */
  effects: Effect[];
  next?: string;
}

export interface ChecklistItem { id: string; label: string; group: string; weight: number; rule?: string }

export interface Flow {
  slug: string;
  engagement: { client: string; scope: string; interviewee: string; profile: "Enterprise" | "Government"; stage: "POC" | "MVP" | "Production" };
  stages: { id: StageId; label: string }[];
  checklist: ChecklistItem[];
  start: string;
  steps: Record<string, Step>;
}

export type Response =
  | { kind: "text"; text: string }
  | { kind: "choice"; index: number }
  | { kind: "upload"; name: string; url?: string }
  | { kind: "roi"; values: Record<string, number> }
  | { kind: "ladder"; solvable: number }
  | { kind: "pillars"; verdicts: Record<string, Verdict> }
  | { kind: "gates"; deferred: string[] };
