import type { Term, TermResult } from "@/lib/harness/glossary";
import type { Tone } from "@/lib/events";

export const PLAIN_SYSTEM = "You are a professional Arabic to English translator for a bank in Qatar. Translate the customer notice into clear, natural English for the bank's website. Return only the translation, keeping the title on its own line. No emoji.";

export function glossarySystem(glossary: Term[]): string {
  return `${PLAIN_SYSTEM}\n\nHouse glossary. Every time one of these Arabic terms appears, render it with exactly this English wording, capitalised as shown:\n${glossary.map((t) => `${t.ar} = ${t.en}`).join("\n")}`;
}

export function counterProps(title: string, text: string, results: TermResult[], compact = false) {
  const honoured = results.filter((r) => r.honoured);
  const missed = results.filter((r) => !r.honoured).map((r) => r.term.en);
  const tone: Tone = missed.length === 0 ? "ok" : "block";
  return {
    title, value: honoured.length, total: results.length, tone, label: "house terms honoured", missed,
    ...(compact ? {} : { text, highlights: honoured.map((r) => ({ text: r.match ?? r.term.en, tone: "ok" as const })) }),
  };
}
