import { describe, it, expect } from "vitest";
import { parseHeader, extractClauses, pairClauses } from "./clauses";

const md = `# T\nVersion: 2.0\nEffective: 2024-06-01\nOwner: Someone\n\n## 1 Purpose\nP text\n\n## 4 Claims\n### 4.1 Documentation\nD text\n### 4.2 Retroactive claims\nR text\nsecond line\n`;

describe("clauses", () => {
  it("parses header", () => {
    expect(parseHeader(md)).toEqual({ title: "T", version: "2.0", effectiveDate: "2024-06-01", owner: "Someone" });
  });
  it("extracts numbered clauses with joined text", () => {
    const c = extractClauses(md);
    expect(c.map((x) => x.id)).toEqual(["1", "4", "4.1", "4.2"]);
    expect(c[3]).toEqual({ id: "4.2", heading: "Retroactive claims", text: "R text second line" });
  });
  it("pairs by id and marks differences", () => {
    const p = pairClauses(extractClauses(md), extractClauses(md.replace("R text", "Other")));
    expect(p.find((x) => x.id === "4.2")?.differs).toBe(true);
    expect(p.find((x) => x.id === "4.1")?.differs).toBe(false);
  });
  it("marks a clause missing on one side as differing", () => {
    const p = pairClauses(extractClauses(md), extractClauses(md.replace("### 4.2 Retroactive claims\nR text\nsecond line\n", "")));
    const c = p.find((x) => x.id === "4.2");
    expect(c?.differs).toBe(true);
    expect(c?.b).toBeUndefined();
  });
});
