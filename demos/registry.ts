import type { DemoManifest } from "./types";
import { manifest as conflictingDocs } from "./conflicting-docs/manifest";

/** Client-safe list of demos, in walkthrough order. Add a manifest import here to register a demo. */
const all: DemoManifest[] = [conflictingDocs];

export const demos: DemoManifest[] = [...all].sort((a, b) => a.order - b.order);

export function getDemo(slug: string): DemoManifest | undefined {
  return demos.find((d) => d.slug === slug);
}

export function nextReadyDemo(slug: string): DemoManifest | undefined {
  const i = demos.findIndex((d) => d.slug === slug);
  return demos.slice(i + 1).find((d) => d.status === "ready");
}
