import type { DemoRunner } from "./types";

/** Server-only: lazy loaders for each demo's live pipeline. */
export const runners: Record<string, () => Promise<{ run: DemoRunner }>> = {
  "conflicting-docs": () => import("./conflicting-docs/run"),
  guardrails: () => import("./guardrails/run"),
  "night-watchman": () => import("./night-watchman/run"),
  "enquiry-to-crm": () => import("./enquiry-to-crm/run"),
  "glossary-translation": () => import("./glossary-translation/run"),
  "document-to-json": () => import("./document-to-json/run"),
  "read-my-dashboard": () => import("./read-my-dashboard/run"),
};
