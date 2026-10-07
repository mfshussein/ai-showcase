/** Pure, testable pieces of the conflicting-docs pipeline (no model calls). */
import { parseHeader, extractClauses, pairClauses } from "@/lib/harness/clauses";
import { nearDuplicate } from "@/lib/harness/text";
import { chunk, buildIndex, search } from "@/lib/harness/bm25";

export const FILES = ["bereavement-policy-v1.md", "Bereavement_Policy_FINAL (copy).md", "bereavement-policy-v2.md"] as const;
export const QUESTION =
  "My father passed away last month and I had to fly to Doha for the funeral at short notice. I have already travelled. Can I still claim the bereavement refund?";

export type Loaded = { name: string; text: string };

export function naiveRetrieval(files: Loaded[], k = 2) {
  const idx = buildIndex(files.flatMap((f) => chunk(f.text, 60, f.name)));
  return search(idx, QUESTION, k);
}

export function gateChecks(files: Loaded[]) {
  const [v1, copy, v2] = files;
  const dup = nearDuplicate(v1.text, copy.text);
  const h1 = parseHeader(v1.text);
  const h2 = parseHeader(v2.text);
  const differing = pairClauses(extractClauses(v1.text), extractClauses(v2.text)).filter((p) => p.differs && p.a && p.b);
  return { dup, h1, h2, differing };
}
