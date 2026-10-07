import { z } from "zod";

export const Tone = z.enum(["ok", "warn", "block", "quarantine", "info"]);
export type Tone = z.infer<typeof Tone>;
export const Slot = z.enum(["main", "left", "right", "aside"]);
export type Slot = z.infer<typeof Slot>;
export const PanelKind = z.enum([
  "markdown", "document", "files", "diff", "table", "chat", "json", "gate", "matrix", "image", "scorecard", "chart", "verdict",
]);
export type PanelKind = z.infer<typeof PanelKind>;
export const Evidence = z.object({ label: z.string(), value: z.string() });
export type Evidence = z.infer<typeof Evidence>;

const t = z.number().int().nonnegative();
const props = z.record(z.string(), z.unknown());

export const RunEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("run.start"), t, demo: z.string(), mode: z.enum(["replay", "live"]), runId: z.string() }),
  z.object({
    type: z.literal("act.start"), t, act: z.number().int().min(1).max(5), title: z.string(),
    subtitle: z.string().optional(), keep: z.array(z.string()).default([]),
  }),
  z.object({ type: z.literal("panel"), t, id: z.string(), kind: PanelKind, slot: Slot.default("main"), props }),
  z.object({ type: z.literal("panel.patch"), t, id: z.string(), patch: props }),
  z.object({ type: z.literal("text.delta"), t, id: z.string(), delta: z.string() }),
  z.object({
    type: z.literal("verdict"), t, id: z.string(), status: z.string(), tone: Tone, headline: z.string(),
    reason: z.string(), evidence: z.array(Evidence).default([]),
  }),
  z.object({
    type: z.literal("control.event"), t, detector: z.string(), policyId: z.string(), score: z.number().optional(),
    action: z.string(), recordId: z.string(), detail: z.string().optional(),
  }),
  z.object({ type: z.literal("pause"), t, label: z.string().optional() }),
  z.object({
    type: z.literal("run.end"), t,
    usage: z.object({ inputTokens: z.number(), outputTokens: z.number(), costUsd: z.number() }).optional(),
  }),
]);
export type RunEvent = z.infer<typeof RunEvent>;

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
/** What a demo runner yields: an event without its timestamp. */
export type RunEventInput = DistributiveOmit<z.input<typeof RunEvent>, "t">;

export const GoldenRun = z
  .object({ demo: z.string(), recordedAt: z.string(), model: z.string(), events: z.array(RunEvent).min(1) })
  .refine((g) => g.events[g.events.length - 1].type === "run.end", { message: "golden must end with run.end" });
export type GoldenRun = z.infer<typeof GoldenRun>;

export function parseGolden(json: unknown): GoldenRun {
  return GoldenRun.parse(json);
}
