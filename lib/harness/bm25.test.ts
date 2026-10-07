import { describe, it, expect } from "vitest";
import { chunk, buildIndex, search } from "./bm25";

describe("bm25", () => {
  const docs = [
    { source: "a", text: "Annual leave is 30 days per year for all employees." },
    { source: "b", text: "The IT acceptable use policy forbids personal devices on the network." },
  ];
  it("chunks by word budget and keeps source", () => {
    const c = chunk("w ".repeat(200), 80, "s");
    expect(c).toHaveLength(3);
    expect(c[0].source).toBe("s");
    expect(c[2].id).toBe("s#2");
  });
  it("ranks the relevant chunk first with a positive score", () => {
    const idx = buildIndex(docs.flatMap((d) => chunk(d.text, 80, d.source)));
    const r = search(idx, "how many days of annual leave", 2);
    expect(r[0].chunk.source).toBe("a");
    expect(r[0].score).toBeGreaterThan(0);
  });
  it("returns empty for no term overlap", () => {
    const idx = buildIndex(chunk("alpha beta", 80, "s"));
    expect(search(idx, "zzz", 3)).toEqual([]);
  });
});
