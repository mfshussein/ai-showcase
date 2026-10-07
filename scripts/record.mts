/** Record a demo's live run into demos/<slug>/golden.json. Usage: npm run record <slug> */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { DemoRunner } from "../demos/types";

// Static imports: tsx transpiles demos/*.ts as CommonJS, where the registry's dynamic import() cannot resolve.
const runners: Record<string, () => Promise<{ run: DemoRunner }>> = {
  "conflicting-docs": () => import("../demos/conflicting-docs/run"),
  guardrails: () => import("../demos/guardrails/run"),
};
import { createLlm, resolveProvider } from "../lib/llm";
import { stamp } from "../lib/stamp";
import { makeFixtureLoader } from "../lib/fixtures";
import { GoldenRun, type RunEvent } from "../lib/events";

const slug = process.argv[2];
if (!slug || !runners[slug]) {
  console.error(`usage: npm run record <slug>\nknown demos: ${Object.keys(runners).join(", ") || "(none)"}`);
  process.exit(1);
}
const provider = resolveProvider();
if (provider.kind === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Put it in .env.local (or set LLM_PROVIDER=openai with LLM_BASE_URL and LLM_API_KEY) and run again.");
  process.exit(1);
}
console.log(`recording ${slug} with ${provider.label}`);
const { run } = await runners[slug]();
const llm = createLlm(provider);
const events: RunEvent[] = [];
const started = Date.now();
for await (const ev of stamp(run({ mode: "record", llm, ...makeFixtureLoader(slug) }))) {
  events.push(ev);
  const extra = ev.type === "verdict" ? ` ${ev.id} ${ev.status}` : "id" in ev ? ` ${ev.id}` : ev.type === "act.start" ? ` ${ev.act} ${ev.title}` : "";
  process.stdout.write(`${String(ev.t).padStart(6)}ms ${ev.type}${extra}\n`);
  if (ev.type === "text.delta") process.stdout.write(`        ${JSON.stringify(ev.delta)}\n`);
}
const golden = GoldenRun.parse({ demo: slug, recordedAt: new Date().toISOString(), model: provider.label, events });
const out = path.join("demos", slug, "golden.json");
await writeFile(out, JSON.stringify(golden, null, 2) + "\n");
const u = llm.usage();
console.log(`\nwrote ${out}: ${events.length} events, ${((Date.now() - started) / 1000).toFixed(1)}s, $${u.costUsd.toFixed(3)} (${u.inputTokens} in / ${u.outputTokens} out)`);
