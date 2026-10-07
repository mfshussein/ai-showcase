import type { DemoRunner } from "../types";
import { checkTerms, score, type Term } from "@/lib/harness/glossary";
import { PLAIN_SYSTEM, glossarySystem, counterProps } from "./shared";

export const run: DemoRunner = async function* (ctx) {
  const source = (await ctx.fixture("notice.ar.md")).trim();
  const glossary = JSON.parse(await ctx.fixture("glossary.json")) as Term[];

  yield { type: "run.start", demo: "glossary-translation", mode: "live", runId: crypto.randomUUID() };

  yield { type: "act.start", act: 1, title: "The claim" };
  yield {
    type: "panel", id: "claim", kind: "markdown",
    props: {
      size: "display",
      title: "Fluent is not the same as correct.",
      text: "A bank's product names, its Sharia structures and its regulator have exact English names. A translation that reads beautifully and renames them is a compliance problem. We make the glossary a control, and we count.",
    },
  };
  yield { type: "pause" };

  yield { type: "act.start", act: 2, title: "The notice and the glossary", subtitle: "Murjan Islamic Bank, a fictional bank. One customer notice, fourteen house terms." };
  yield { type: "panel", id: "source", kind: "document", slot: "left", props: { title: "Customer notice (Arabic original)", text: source, lang: "ar" } };
  yield {
    type: "panel", id: "glossary", kind: "table", slot: "right",
    props: { title: "House glossary, 14 terms", columns: [{ key: "ar", label: "Arabic" }, { key: "en", label: "House English" }], rows: glossary.map((t) => ({ ar: t.ar, en: t.en })) },
  };
  yield { type: "pause" };

  yield { type: "act.start", act: 3, title: "Without the glossary", subtitle: "A capable model, asked for a natural translation." };
  yield { type: "panel", id: "plain", kind: "markdown", props: { title: "Translating…", text: "" } };
  let plain = "";
  for await (const d of ctx.llm.stream({ model: "main", effort: "low", maxTokens: 900, system: PLAIN_SYSTEM, prompt: source })) {
    plain += d;
    yield { type: "text.delta", id: "plain", delta: d };
  }
  const plainResults = checkTerms(plain, glossary);
  const ps = score(plainResults);
  yield { type: "panel", id: "plain", kind: "counter", props: counterProps("Natural translation", plain, plainResults) };
  yield { type: "control.event", detector: "glossary.check", policyId: "LANG-01", score: ps.honoured / ps.total, action: ps.missed.length ? "flag" : "allow", recordId: "CE-8001", detail: `${ps.honoured}/${ps.total} without glossary` };
  yield { type: "pause" };

  yield { type: "act.start", act: 4, title: "With the glossary", subtitle: "Same model, glossary injected, every term checked in code.", keep: ["plain"] };
  yield { type: "panel", id: "plain", kind: "counter", slot: "left", props: counterProps("Without the glossary", plain, plainResults, true) };
  yield { type: "panel", id: "locked", kind: "markdown", slot: "right", props: { title: "Translating with the glossary…", text: "" } };
  let locked = "";
  for await (const d of ctx.llm.stream({ model: "main", effort: "low", maxTokens: 900, system: glossarySystem(glossary), prompt: source })) {
    locked += d;
    yield { type: "text.delta", id: "locked", delta: d };
  }
  let results = checkTerms(locked, glossary);
  let s = score(results);
  let reasked = false;
  if (s.missed.length) {
    reasked = true;
    yield { type: "control.event", detector: "glossary.check", policyId: "LANG-01", action: "re-ask", recordId: "CE-8002", detail: `missed: ${s.missed.join(", ")}` };
    yield { type: "panel.patch", id: "locked", patch: { title: `Re-asking once: ${s.missed.length} term${s.missed.length > 1 ? "s" : ""} missed (${s.missed.join(", ")})` } };
    locked = await ctx.llm.text({
      model: "main", effort: "low", maxTokens: 900, system: glossarySystem(glossary),
      prompt: `Arabic original:\n${source}\n\nYour translation:\n${locked}\n\nThese house terms are missing or worded differently: ${s.missed.join("; ")}. Return the full corrected translation only.`,
    });
    results = checkTerms(locked, glossary);
    s = score(results);
  }
  yield { type: "panel", id: "locked", kind: "counter", slot: "right", props: counterProps(reasked ? "With the glossary, after one re-ask" : "With the glossary", locked, results) };
  const pass = s.missed.length === 0;
  yield {
    type: "verdict", id: "verdict", status: pass ? `GLOSSARY ${s.honoured}/${s.total}` : `${s.honoured}/${s.total} HELD FOR REVIEWER`, tone: pass ? "ok" : "warn",
    headline: pass ? "Every product, structure and regulator named exactly as the bank names them." : "Still not exact after one re-ask, so a human reviewer signs it off before it is published.",
    reason: `Without the glossary: ${ps.honoured}/${ps.total}. With it: ${s.honoured}/${s.total}${reasked ? ", after one automatic re-ask naming the missed terms" : ""}. The count is code, not the model's opinion.`,
    evidence: [
      { label: "Before", value: `${ps.missed.length} of ${ps.total} terms missed` },
      { label: "After", value: s.missed.length ? `missed: ${s.missed.join(", ")}` : "none missed" },
      { label: "Model", value: ctx.llm.label },
    ],
  };
  yield { type: "control.event", detector: "glossary.check", policyId: "LANG-01", score: s.honoured / s.total, action: pass ? "allow" : "hold", recordId: "CE-8003", detail: `${s.honoured}/${s.total} with glossary` };
  yield { type: "pause" };

  yield { type: "act.start", act: 5, title: "Proof" };
  yield {
    type: "panel", id: "terms", kind: "table",
    props: {
      title: "Term by term",
      columns: [{ key: "term", label: "House term" }, { key: "before", label: "Without" }, { key: "after", label: "With" }],
      rows: glossary.map((t, i) => ({
        term: t.en,
        before: plainResults[i].honoured ? { text: "YES", tone: "ok" } : { text: "MISSED", tone: "block" },
        after: results[i].honoured ? { text: "YES", tone: "ok" } : { text: "MISSED", tone: "block" },
      })),
    },
  };
  yield {
    type: "panel", id: "takeaway", kind: "markdown",
    props: { tone: "ok", title: "Terminology is a control, not a style guide.", text: "The glossary is injected, every term is checked in code, the model gets one automatic re-ask, and anything still off waits for a reviewer. The thing Arabic-first teams distrust most, handled by a system." },
  };
  yield { type: "run.end", usage: ctx.llm.usage() };
};
