/** Deterministic glossary compliance: did the translation use the house rendering of every term? */
export type Term = { ar: string; en: string };
export type TermResult = { term: Term; honoured: boolean; match?: string };

/** Same-length substitutions only, so match positions still line up with the original text. */
const plainPunctuation = (s: string) => s.replace(/[‘’ʼ]/g, "'").replace(/[‐-―]/g, "-");
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function termPattern(en: string): RegExp {
  const body = plainPunctuation(en.trim()).split(/\s+/).map(escape).join("\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}s?(?![\\p{L}\\p{N}])`, "iu");
}

export function checkTerms(translation: string, glossary: Term[]): TermResult[] {
  // Markdown emphasis becomes spaces (same length), so "**Golden Saver** Account" still matches.
  const text = plainPunctuation(translation).replace(/[*_]/g, " ");
  return glossary.map((term) => {
    const m = termPattern(term.en).exec(text);
    return m ? { term, honoured: true, match: translation.slice(m.index, m.index + m[0].length) } : { term, honoured: false };
  });
}

export function score(results: TermResult[]): { honoured: number; total: number; missed: string[] } {
  return { honoured: results.filter((r) => r.honoured).length, total: results.length, missed: results.filter((r) => !r.honoured).map((r) => r.term.en) };
}

/** For checking that glossary terms occur in the Arabic source: drop diacritics and tatweel, unify alef forms. */
export function normaliseArabic(s: string): string {
  return s.replace(/[ً-ْٰـ]/g, "").replace(/[إأآ]/g, "ا").replace(/\s+/g, " ").trim();
}
