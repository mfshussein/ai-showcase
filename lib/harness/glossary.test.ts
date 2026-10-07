import { describe, it, expect } from "vitest";
import { checkTerms, score, normaliseArabic, type Term } from "./glossary";

const G: Term[] = [
  { ar: "صكوك دانة", en: "Dana Sukuk Certificates" },
  { ar: "تعميم المصرف", en: "QCB Circular" },
  { ar: "حساب التوفير الذهبي", en: "Golden Saver Account" },
];

describe("checkTerms", () => {
  it("honours exact terms", () => {
    const r = checkTerms("Holders of Dana Sukuk Certificates must read the QCB Circular.", G);
    expect(r.map((x) => x.honoured)).toEqual([true, true, false]);
  });
  it("ignores case, extra spaces and line breaks", () => {
    expect(checkTerms("dana  sukuk\ncertificates", G)[0].honoured).toBe(true);
  });
  it("accepts a plural s but not a longer word", () => {
    expect(checkTerms("two QCB Circulars", G)[1].honoured).toBe(true);
    expect(checkTerms("the QCB Circularity", G)[1].honoured).toBe(false);
  });
  it("treats curly apostrophes and en dashes like their plain forms", () => {
    expect(checkTerms("Profit–Sharing Ratio’s", [{ ar: "x", en: "Profit-Sharing Ratio's" }])[0].honoured).toBe(true);
  });
  it("returns match spans as the text appears, for highlighting", () => {
    expect(checkTerms("See the qcb circular now", G)[1].match).toBe("qcb circular");
  });
});

describe("score", () => {
  it("counts honoured and lists missed terms in glossary order", () => {
    expect(score(checkTerms("Golden Saver Account only", G))).toEqual({ honoured: 1, total: 3, missed: ["Dana Sukuk Certificates", "QCB Circular"] });
  });
});

describe("normaliseArabic", () => {
  it("strips diacritics and tatweel and unifies alef forms", () => {
    expect(normaliseArabic("الصُّكُوك ـالإسلامية")).toBe(normaliseArabic("الصكوك الاسلامية"));
  });
});
