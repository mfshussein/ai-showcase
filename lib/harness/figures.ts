/** Trace every number a model quoted back to the source it read. Numbers that are not on the source are derived or invented. */
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function westernDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/٫/g, ".").replace(/٬/g, ",");
}

function numbersIn(text: string): number[] {
  const out: number[] = [];
  for (const m of westernDigits(text).matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)) out.push(Number(m[0].replace(/,/g, "")));
  return out;
}

const isYear = (n: number) => Number.isInteger(n) && n >= 1900 && n <= 2100;

export function extractFigures(text: string): string[] {
  const seen = new Set<string>();
  for (const n of numbersIn(text)) if (!isYear(n)) seen.add(String(n));
  return [...seen];
}

export function traceFigures(quoted: string[], source: string): { found: string[]; notFound: string[] } {
  const have = new Set(numbersIn(source));
  const found: string[] = [];
  const notFound: string[] = [];
  for (const q of quoted) (have.has(Number(q)) ? found : notFound).push(q);
  return { found, notFound };
}
