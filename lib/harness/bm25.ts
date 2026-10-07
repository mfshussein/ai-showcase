export interface Chunk { id: string; text: string; source: string }

export function chunk(text: string, maxWords = 80, source = ""): Chunk[] {
  const w = text.split(/\s+/).filter(Boolean);
  const out: Chunk[] = [];
  for (let i = 0; i < w.length; i += maxWords) out.push({ id: `${source}#${out.length}`, text: w.slice(i, i + maxWords).join(" "), source });
  return out;
}

const tokenize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((t) => t.length > 1);

export interface Index { chunks: Chunk[]; df: Map<string, number>; tf: Map<string, number>[]; lens: number[]; avgLen: number }

export function buildIndex(chunks: Chunk[]): Index {
  const tf = chunks.map((c) => {
    const m = new Map<string, number>();
    for (const t of tokenize(c.text)) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  });
  const df = new Map<string, number>();
  for (const m of tf) for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const lens = chunks.map((c) => tokenize(c.text).length);
  return { chunks, df, tf, lens, avgLen: lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length) };
}

/** Okapi BM25. Returns only chunks with a positive score, best first. */
export function search(idx: Index, query: string, k: number, k1 = 1.2, b = 0.75): { chunk: Chunk; score: number }[] {
  const N = idx.chunks.length;
  const terms = tokenize(query);
  return idx.chunks
    .map((chunk, i) => {
      let s = 0;
      for (const t of terms) {
        const f = idx.tf[i].get(t) ?? 0;
        if (!f) continue;
        const n = idx.df.get(t) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        s += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * idx.lens[i]) / idx.avgLen));
      }
      return { chunk, score: Math.round(s * 1000) / 1000 };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, k);
}
