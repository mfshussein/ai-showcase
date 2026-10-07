import type { DemoRunner } from "./types";

/** Server-only: lazy loaders for each demo's live pipeline. */
export const runners: Record<string, () => Promise<{ run: DemoRunner }>> = {};
