import { createHash } from "node:crypto";

export const normalizeText = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
export const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");

export function wordShingles(text: string, k = 3): Set<string> {
  const w = normalizeText(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(" "));
  if (out.size === 0 && w.length) out.add(w.join(" "));
  return out;
}

export function charShingles(text: string, k = 5): Set<string> {
  const s = normalizeText(text);
  const out = new Set<string>();
  for (let i = 0; i + k <= s.length; i++) out.add(s.slice(i, i + k));
  return out;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 1 : inter / union;
}

/** Near-duplicate score: the better of word-trigram and character-5-gram Jaccard similarity. */
export function nearDuplicate(a: string, b: string, threshold = 0.9): { score: number; duplicate: boolean } {
  const s = Math.max(jaccard(wordShingles(a), wordShingles(b)), jaccard(charShingles(a), charShingles(b)));
  const score = Math.round(s * 1000) / 1000;
  return { score, duplicate: score >= threshold };
}
