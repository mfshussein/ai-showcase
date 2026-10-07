export interface Clause { id: string; heading: string; text: string }
export interface DocHeader { title: string; version: string; effectiveDate: string; owner: string }

export function parseHeader(md: string): DocHeader {
  return {
    title: /^#\s+(.+)$/m.exec(md)?.[1]?.trim() ?? "",
    version: /^Version:\s*(.+)$/m.exec(md)?.[1]?.trim() ?? "",
    effectiveDate: /^Effective:\s*(\d{4}-\d{2}-\d{2})/m.exec(md)?.[1] ?? "",
    owner: /^Owner:\s*(.+)$/m.exec(md)?.[1]?.trim() ?? "",
  };
}

/** Clauses are markdown headings numbered like "## 4 Claims" or "### 4.2 Retroactive claims", with the text until the next heading. */
export function extractClauses(md: string): Clause[] {
  const out: Clause[] = [];
  let cur: Clause | null = null;
  for (const line of md.split("\n")) {
    const m = /^#{2,4}\s+(\d+(?:\.\d+)*)\s+(.+)$/.exec(line);
    if (m) {
      if (cur) out.push(cur);
      cur = { id: m[1], heading: m[2].trim(), text: "" };
      continue;
    }
    if (cur && line.trim()) cur.text = cur.text ? `${cur.text} ${line.trim()}` : line.trim();
  }
  if (cur) out.push(cur);
  return out;
}

const norm = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

export function pairClauses(a: Clause[], b: Clause[]): { id: string; a?: Clause; b?: Clause; differs: boolean }[] {
  const ids = [...new Set([...a.map((c) => c.id), ...b.map((c) => c.id)])]
    .sort((x, y) => x.localeCompare(y, undefined, { numeric: true }));
  return ids.map((id) => {
    const ca = a.find((c) => c.id === id);
    const cb = b.find((c) => c.id === id);
    return { id, a: ca, b: cb, differs: norm(ca?.text) !== norm(cb?.text) };
  });
}
