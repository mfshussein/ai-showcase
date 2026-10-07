import type { DemoRunner } from "../types";
import type { Tone } from "@/lib/events";
import { recordVerdict, type Check } from "@/lib/harness/doc-checks";
import { DOCS, flatten, TODAY, type Field } from "./shared";

const src = (file: string) => `/fixtures/document-to-json/${file}`;
const verdictTone: Record<ReturnType<typeof recordVerdict>, Tone> = { RELEASED: "ok", "HUMAN CHECK": "warn", BLOCKED: "block" };
const CAVEAT = "This is extraction and validation, not identity verification. In production, identity checks go through a licensed KYC provider (liveness, document authenticity, watchlists).";

export const run: DemoRunner = async function* (ctx) {
  yield { type: "run.start", demo: "document-to-json", mode: "live", runId: crypto.randomUUID() };

  yield { type: "act.start", act: 1, title: "The claim" };
  yield {
    type: "panel", id: "claim", kind: "markdown",
    props: {
      size: "display",
      title: "Downstream systems only ever receive validated records.",
      text: "Reading documents is now easy. The damage comes from a total that does not add up, or an expired ID, flowing straight into the ERP or the onboarding system. Here the model reads, and code decides.",
    },
  };
  yield { type: "pause" };

  yield { type: "act.start", act: 2, title: "This morning's inbox", subtitle: "Three images, as they arrive: printed, photographed, handwritten." };
  yield { type: "panel", id: "inbox", kind: "image", props: { title: "Inbox", images: DOCS.map((d) => ({ src: src(d.file), alt: d.title, caption: d.title })) } };
  yield { type: "panel", id: "caveat", kind: "markdown", props: { tone: "info", text: CAVEAT } };
  yield { type: "pause" };

  yield { type: "act.start", act: 4, title: "Extract, then validate", subtitle: "Every field with a confidence. Every record through deterministic checks." };
  const results: { title: string; verdict: ReturnType<typeof recordVerdict>; checks: Check[] }[] = [];
  let ce = 7001;
  for (const [i, doc] of DOCS.entries()) {
    if (i > 0) yield { type: "pause", label: "Next document" };
    yield { type: "panel", id: "doc", kind: "image", slot: "left", props: { title: doc.title, src: src(doc.file), alt: doc.title } };
    yield { type: "panel", id: "record", kind: "json", slot: "right", props: { title: "Extracting…", fields: [] } };
    const rec = (await ctx.llm.vision({
      model: "main", schema: doc.schema,
      image: { data: (await ctx.fixtureBuffer(doc.file)).toString("base64"), mediaType: "image/png" },
      system: "You extract structured data from business documents for a back-office system in Qatar. Return only what is on the document. No emoji.",
      prompt: doc.prompt,
    })) as Record<string, unknown>;
    const checks = doc.checks(rec);
    const fields = Object.entries(flatten(rec)).map(([path, f]: [string, Field]) => {
      const bad = checks.filter((c) => !c.ok && c.field === path);
      const c = bad.find((x) => x.tone === "block") ?? bad[0];
      return { path, value: f.value, confidence: f.confidence, tone: c ? c.tone : "ok", note: c ? (c.tone === "block" ? "fails check" : "human check") : undefined };
    });
    yield { type: "panel.patch", id: "record", patch: { title: `Record: ${doc.title}`, fields } };
    const verdict = recordVerdict(checks);
    results.push({ title: doc.title, verdict, checks });
    yield {
      type: "panel", id: "checks", kind: "table", slot: "main",
      props: {
        title: `Validation: ${verdict}`,
        columns: [{ key: "rule", label: "Check" }, { key: "message", label: "Finding" }, { key: "result", label: "Result" }],
        rows: (checks.length ? checks : [{ field: "all", rule: "all checks", ok: true, tone: "ok", message: "Every field readable and above the confidence floor" } as Check])
          .map((c) => ({ rule: c.rule, message: c.message, result: { text: c.ok ? "PASS" : c.tone === "block" ? "BLOCK" : "HUMAN CHECK", tone: c.tone } })),
      },
    };
    for (const c of checks.filter((x) => !x.ok)) {
      yield { type: "control.event", detector: `doc.${c.rule}`, policyId: c.tone === "block" ? "DOC-01" : "DOC-02", action: c.tone === "block" ? "block" : "hold", recordId: `CE-${ce++}`, detail: `${doc.title}: ${c.message}` };
    }
  }
  const released = results.filter((r) => r.verdict === "RELEASED").length;
  const blocked = results.filter((r) => r.verdict === "BLOCKED").length;
  const held = results.filter((r) => r.verdict === "HUMAN CHECK").length;
  yield {
    type: "verdict", id: "verdict", status: `${released} OF ${results.length} RELEASED`, tone: released === results.length ? "ok" : "quarantine",
    headline: "Downstream systems only ever receive validated records.",
    reason: `${blocked} blocked by validation, ${held} waiting for a human check. Nothing reached the ERP or the onboarding system on the model's word alone.`,
    evidence: results.map((r) => ({ label: r.title.split(",")[0].split(" (")[0], value: `${r.verdict}${r.checks.filter((c) => !c.ok).length ? `: ${r.checks.filter((c) => !c.ok).map((c) => c.message).join("; ")}` : ""}` })),
  };
  yield { type: "pause" };

  yield { type: "act.start", act: 5, title: "Proof" };
  yield {
    type: "panel", id: "batch", kind: "table",
    props: {
      title: `Batch result, validated against today's date ${TODAY}`,
      columns: [{ key: "doc", label: "Document" }, { key: "result", label: "Result" }, { key: "why", label: "Why" }],
      rows: results.map((r) => ({ doc: r.title, result: { text: r.verdict, tone: verdictTone[r.verdict] }, why: r.checks.filter((c) => !c.ok).map((c) => c.message).join("; ") || "All checks passed" })),
    },
  };
  yield { type: "panel", id: "caveat2", kind: "markdown", props: { tone: "info", text: CAVEAT } };
  yield {
    type: "panel", id: "takeaway", kind: "markdown",
    props: { tone: "ok", title: "The model reads. Code decides.", text: "Per-field confidence, arithmetic and date checks in code, and a human queue for anything uncertain. Downstream systems only ever receive validated records." },
  };
  yield { type: "run.end", usage: ctx.llm.usage() };
};
