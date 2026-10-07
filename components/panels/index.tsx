import type { ComponentType } from "react";
import type { PanelKind } from "@/lib/events";
import { MarkdownPanel } from "./markdown";
import { DocumentPanel } from "./document";
import { FilesPanel } from "./files";
import { DiffPanel } from "./diff";
import { TablePanel } from "./table";
import { ChatPanel } from "./chat";
import { JsonPanel } from "./json";
import { GatePanel } from "./gate";
import { VerdictPanel } from "./verdict";
import { MatrixPanel } from "./matrix";
import { ImagePanel } from "./image";
import { ScorecardPanel } from "./scorecard";
import { CounterPanel } from "./counter";
import { TimelinePanel } from "./timeline";
import { EmailPanel } from "./email";

export type PanelProps = { id: string; props: Record<string, unknown> };

/**
 * Panel prop contracts (what a demo's events carry):
 * markdown  { text, title?, tone?, size?: "display" }
 * document  { title, text, highlight?, lang? }
 * files     { title?, files: { name, size?, status?, tone?, meta? }[] }
 * diff      { title, leftTitle, rightTitle, left, right, leftHighlight?, rightHighlight? }
 * table     { title?, columns: {key,label}[], rows: Record<key, string|number|{text,tone}>[] }
 * chat      { title?, messages: {role,text,note?}[], text? (streaming reply) }
 * json      { title?, value, errors?: {path,message}[], fields?: {path,value,confidence?,tone?,note?}[] (table instead of raw JSON) }
 * gate      { title?, stages: {id,label,state: idle|pass|fire|skip, note?}[] }
 * verdict   { status, tone, headline, reason, evidence }
 * matrix    { title?, xLabels:[a,b], yLabels:[a,b], items: {label,x,y,tone?}[] }
 * image     { title?, src, alt, callouts?: {x,y,w,h,label}[] (percent) } or { title?, images: {src,alt,caption?,selected?}[] } (grid)
 * scorecard { title?, criteria: {name,a?,b?,max,reasoning?}[], winner? }
 * counter   { title?, value, total, label?, tone?, text?, highlights?: {text,tone}[], missed?: string[] }
 * timeline  { title?, nights: {date, state: quiet|alert|running|pending, count?}[] }
 * email     { title?, from, to, subject, text, sentAt? }
 */
export const PANELS: Record<PanelKind, ComponentType<PanelProps>> = {
  markdown: MarkdownPanel,
  document: DocumentPanel,
  files: FilesPanel,
  diff: DiffPanel,
  table: TablePanel,
  chat: ChatPanel,
  json: JsonPanel,
  gate: GatePanel,
  verdict: VerdictPanel,
  matrix: MatrixPanel,
  image: ImagePanel,
  scorecard: ScorecardPanel,
  chart: TablePanel,
  counter: CounterPanel,
  timeline: TimelinePanel,
  email: EmailPanel,
};
