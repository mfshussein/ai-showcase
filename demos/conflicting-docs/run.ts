import { z } from "zod";
import type { DemoRunner } from "../types";
import { sha256Hex } from "@/lib/harness/text";
import { chunk, buildIndex, search } from "@/lib/harness/bm25";
import { FILES, QUESTION, naiveRetrieval, gateChecks, type Loaded } from "./shared";

const Contradiction = z.object({
  contradicts: z.boolean(),
  topic: z.string(),
  aQuote: z.string(),
  bQuote: z.string(),
  explanation: z.string(),
});

type Row = { file: string; step: string; status: { text: string; tone: "ok" | "warn" | "block" | "quarantine" | "info" } };
const snapshot = (rows: Row[]) => rows.map((r) => ({ ...r, status: { ...r.status } }));

export const run: DemoRunner = async function* (ctx) {
  const files: Loaded[] = [];
  for (const name of FILES) files.push({ name, text: await ctx.fixture(name) });
  const [v1, copy, v2] = files;
  const { dup, h1, h2, differing } = gateChecks(files);

  yield { type: "run.start", demo: "conflicting-docs", mode: "live", runId: crypto.randomUUID() };

  // Act 1: the claim
  yield { type: "act.start", act: 1, title: "The claim" };
  yield {
    type: "panel", id: "claim", kind: "markdown",
    props: {
      size: "display",
      title: "Your chatbot will cite whichever version of the policy it finds first.",
      text: "Marsa Airways keeps its bereavement policy in a shared drive. Three files are in there. Two of them disagree. A grieving customer is about to ask the question that cost Air Canada a tribunal case.",
    },
  };
  yield { type: "pause" };

  // Act 2: the files
  yield { type: "act.start", act: 2, title: "Three files" };
  yield {
    type: "panel", id: "files", kind: "files", slot: "left",
    props: {
      title: "Shared drive, Policies folder",
      files: files.map((f) => {
        const h = f === v2 ? h2 : h1;
        return { name: f.name, size: `${(f.text.length / 1024).toFixed(1)} KB`, meta: `Version ${h.version}, effective ${h.effectiveDate}` };
      }),
    },
  };
  yield { type: "panel", id: "doc", kind: "document", slot: "right", props: { title: v1.name, text: v1.text, highlight: "within 90 days of the ticket issue date" } };
  yield { type: "pause" };

  // Act 3: without the harness
  yield { type: "act.start", act: 3, title: "Without the harness", subtitle: "A typical chatbot: find the best-matching passages, answer from them.", keep: ["files"] };
  const hits = naiveRetrieval(files, 2);
  yield {
    type: "panel", id: "retrieval", kind: "table", slot: "right",
    props: {
      title: "Retrieved passages, best two matches",
      columns: [{ key: "source", label: "Source" }, { key: "score", label: "Score" }, { key: "text", label: "Passage" }],
      rows: hits.map((h) => ({ source: h.chunk.source, score: h.score, text: h.chunk.text.slice(0, 160) + "…" })),
    },
  };
  yield { type: "pause" };
  yield { type: "panel", id: "chat1", kind: "chat", slot: "main", props: { title: "Customer chat, no harness", messages: [{ role: "user", text: QUESTION }], text: "" } };
  const naive = ctx.llm.stream({
    model: "main", effort: "low", maxTokens: 350,
    system: "You are the Marsa Airways customer assistant. Answer the customer using only the policy passages provided. Be warm, concise and definite. No emoji. Do not mention that there may be other versions of the policy.",
    prompt: `Policy passages:\n${hits.map((h) => `[${h.chunk.source}] ${h.chunk.text}`).join("\n\n")}\n\nCustomer: ${QUESTION}`,
  });
  for await (const d of naive) yield { type: "text.delta", id: "chat1", delta: d };
  yield {
    type: "panel", id: "gasp", kind: "markdown", slot: "main",
    props: { tone: "block", title: "Confidently wrong.", text: "Both retrieved passages came from the 2022 policy, because the stray copy outvoted the current version. The customer has just been promised a refund the airline withdrew in 2024." },
  };
  yield { type: "pause" };

  // Act 4: with the harness
  yield { type: "act.start", act: 4, title: "With the harness", subtitle: "Nothing is indexed until it passes the ingestion gate.", keep: ["files"] };
  const rows: Row[] = files.map((f) => ({ file: f.name, step: "queued", status: { text: "PENDING", tone: "info" } }));
  const gatePanel = () => ({
    type: "panel" as const, id: "gate", kind: "table" as const, slot: "main" as const,
    props: { title: "Ingestion gate", columns: [{ key: "file", label: "File" }, { key: "step", label: "Check" }, { key: "status", label: "Result" }], rows: snapshot(rows) },
  });
  yield gatePanel();
  files.forEach((f, i) => { rows[i].step = `sha256 ${sha256Hex(f.text).slice(0, 12)}…`; });
  yield { type: "panel.patch", id: "gate", patch: { rows: snapshot(rows) } };
  rows[1].step = `near-duplicate of ${v1.name}, similarity ${dup.score}`;
  rows[1].status = { text: "DUPLICATE, dropped", tone: "warn" };
  yield { type: "panel.patch", id: "gate", patch: { rows: snapshot(rows) } };
  yield { type: "control.event", detector: "dedupe.shingles", policyId: "DATA-01", score: dup.score, action: "drop", recordId: "CE-1001", detail: `${copy.name} duplicates ${v1.name}` };
  rows[0].step = `version ${h1.version} vs ${h2.version}: ${differing.length} clauses differ`;
  rows[2].step = rows[0].step;
  yield { type: "panel.patch", id: "gate", patch: { rows: snapshot(rows) } };

  let conflict: { id: string; heading: string; a: string; b: string; explanation: string } | null = null;
  for (const p of differing) {
    const r = await ctx.llm.parse({
      model: "fast", effort: "low", schema: Contradiction,
      system: "You compare two versions of the same policy clause and decide whether they contradict each other on a point a customer could rely on. A changed deadline or a reversed rule is a contradiction; a rewording with the same meaning is not. Quote the exact words from each version.",
      prompt: `Clause ${p.id} ${p.a!.heading}\n\nVersion A (${h1.version}, effective ${h1.effectiveDate}):\n${p.a!.text}\n\nVersion B (${h2.version}, effective ${h2.effectiveDate}):\n${p.b!.text}`,
    });
    rows[0].step = `clause ${p.id}: ${r.contradicts ? "contradiction" : "wording only"}`;
    rows[2].step = `version ${h2.version}: newest, effective ${h2.effectiveDate}`;
    yield { type: "panel.patch", id: "gate", patch: { rows: snapshot(rows) } };
    if (r.contradicts && (p.id === "4.2" || !conflict)) conflict = { id: p.id, heading: p.a!.heading, a: r.aQuote, b: r.bQuote, explanation: r.explanation };
    if (conflict && p.id === "4.2") break;
  }
  const pair = differing.find((p) => p.id === (conflict?.id ?? "4.2")) ?? differing[0];
  rows[2].status = { text: "INGESTED, current", tone: "ok" };
  if (conflict) {
    rows[0].status = { text: "CONFLICT, superseded", tone: "quarantine" };
    yield { type: "panel.patch", id: "gate", patch: { rows: snapshot(rows) } };
    yield {
      type: "panel", id: "diff", kind: "diff", slot: "main",
      props: {
        title: `Clause ${pair.id} ${pair.a!.heading}: the two versions contradict`,
        leftTitle: `Version ${h1.version}, effective ${h1.effectiveDate}`, rightTitle: `Version ${h2.version}, effective ${h2.effectiveDate}`,
        left: pair.a!.text, right: pair.b!.text, leftHighlight: conflict.a, rightHighlight: conflict.b,
      },
    };
    yield {
      type: "verdict", id: "verdict", status: "QUARANTINED", tone: "quarantine",
      headline: `Version ${h1.version} quarantined and its owner notified. Only version ${h2.version} is indexed.`,
      reason: conflict.explanation,
      evidence: [
        { label: "Clause", value: `${pair.id} ${pair.a!.heading}` },
        { label: "Owner", value: h1.owner || "Customer Relations" },
        { label: "v1 says", value: conflict.a },
        { label: "v2 says", value: conflict.b },
      ],
    };
  } else {
    // Honest path: the versions differ but the classifier did not confirm a contradiction. Still nothing stale gets indexed.
    rows[0].status = { text: "SUPERSEDED, held", tone: "warn" };
    yield { type: "panel.patch", id: "gate", patch: { rows: snapshot(rows) } };
    yield {
      type: "panel", id: "diff", kind: "diff", slot: "main",
      props: { title: `Clause ${pair.id} ${pair.a!.heading}: the two versions differ`, leftTitle: `Version ${h1.version}, effective ${h1.effectiveDate}`, rightTitle: `Version ${h2.version}, effective ${h2.effectiveDate}`, left: pair.a!.text, right: pair.b!.text },
    };
    yield {
      type: "verdict", id: "verdict", status: "HELD FOR REVIEW", tone: "warn",
      headline: `Version ${h1.version} is superseded and held for its owner to review. Only version ${h2.version} is indexed.`,
      reason: `${differing.length} clauses differ between the versions. The classifier did not confirm a direct contradiction, so the older version is held rather than quarantined, and the owner decides.`,
      evidence: [{ label: "Clauses", value: differing.map((d) => d.id).join(", ") }, { label: "Owner", value: h1.owner || "Customer Relations" }],
    };
  }
  yield { type: "control.event", detector: "conflict.clause", policyId: "DATA-02", action: conflict ? "quarantine" : "hold", recordId: "CE-1002", detail: `clause ${pair.id}, version ${h1.version} vs ${h2.version}` };
  yield { type: "pause" };

  const idx2 = buildIndex(chunk(v2.text, 60, v2.name));
  const hits2 = search(idx2, QUESTION, 2);
  yield {
    type: "panel", id: "chat2", kind: "chat", slot: "main",
    props: { title: "Customer chat, with the harness", messages: [{ role: "system", text: `1 document quarantined pending owner review. Answering from version ${h2.version} only.` }, { role: "user", text: QUESTION }], text: "" },
  };
  const good = ctx.llm.stream({
    model: "main", effort: "low", maxTokens: 350,
    system: "You are the Marsa Airways customer assistant. Answer the customer using only the policy passages provided. Be warm and clear, cite the clause number, and if the policy does not allow what they ask, say so plainly and offer to raise it with Customer Relations. No emoji.",
    prompt: `Policy passages:\n${hits2.map((h) => `[${h.chunk.source}] ${h.chunk.text}`).join("\n\n")}\n\nCustomer: ${QUESTION}`,
  });
  for await (const d of good) yield { type: "text.delta", id: "chat2", delta: d };
  yield { type: "pause" };

  // Act 5: proof
  yield { type: "act.start", act: 5, title: "Proof" };
  yield {
    type: "panel", id: "lifecycle", kind: "table", slot: "main",
    props: {
      title: "Document lifecycle after the gate",
      columns: [{ key: "file", label: "File" }, { key: "state", label: "State" }, { key: "why", label: "Why" }],
      rows: [
        { file: v2.name, state: { text: "CURRENT", tone: "ok" }, why: `Effective ${h2.effectiveDate}, newest version` },
        { file: v1.name, state: conflict ? { text: "SUPERSEDED, QUARANTINED", tone: "quarantine" } : { text: "SUPERSEDED, HELD", tone: "warn" }, why: conflict ? `Clause ${pair.id} contradicts the current version` : `Clauses ${differing.map((d) => d.id).join(", ")} differ; owner to review` },
        { file: copy.name, state: { text: "DROPPED", tone: "warn" }, why: `Duplicate of version ${h1.version}, similarity ${dup.score}` },
      ],
    },
  };
  yield {
    type: "panel", id: "takeaway", kind: "markdown", slot: "main",
    props: { tone: "ok", title: "This is the control that would have stopped Air Canada.", text: "Responses drawn only from approved sources. Conflicting versions quarantined before indexing. The owner notified. Every decision logged." },
  };
  yield { type: "run.end", usage: ctx.llm.usage() };
};
