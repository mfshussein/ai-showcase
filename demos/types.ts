import type { RunEventInput } from "@/lib/events";
import type { Llm } from "@/lib/llm";

export type ActNumber = 1 | 2 | 3 | 4 | 5;

export interface DemoManifest {
  slug: string;
  /** Position in the default walkthrough; lower first. */
  order: number;
  title: string;
  hook: string;
  lesson: { name: string; year: string; line: string };
  tags: { capability: string[]; useCase: string[]; vertical: string[] };
  acts: { act: ActNumber; title: string }[];
  takeaway: string;
  status: "ready" | "soon";
}

export interface RunContext {
  mode: "live" | "record";
  llm: Llm;
  fixture: (name: string) => Promise<string>;
  fixtureBuffer: (name: string) => Promise<Buffer>;
}

export type DemoRunner = (ctx: RunContext) => AsyncGenerator<RunEventInput>;
