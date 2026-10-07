export type PiiKind = "QID" | "PHONE" | "IBAN" | "EMAIL";
export interface PiiFinding { kind: PiiKind; value: string; replacement: string; index: number }

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
/** Same length as the input, so indices map one to one. */
const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

/** Order matters: longer, more specific patterns first so their digits are not re-matched as phones or IDs. */
const PATTERNS: { kind: PiiKind; re: RegExp }[] = [
  { kind: "EMAIL", re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { kind: "IBAN", re: /\bQA\d{2}[A-Z]{4}[A-Z0-9]{21}\b/g },
  { kind: "PHONE", re: /(?:\+974[\s-]?)?\b[3567]\d{3}[\s-]?\d{4}\b/g },
  { kind: "QID", re: /\b[23]\d{10}\b/g },
];

/** Masks Qatar IDs, Qatari phone numbers, Qatari IBANs and emails. Arabic-Indic digits are recognised. */
export function maskPii(text: string): { masked: string; findings: PiiFinding[] } {
  const latin = toLatinDigits(text);
  const claimed: [number, number][] = [];
  const findings: PiiFinding[] = [];
  for (const { kind, re } of PATTERNS) {
    for (const m of latin.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (claimed.some(([a, b]) => start < b && end > a)) continue;
      claimed.push([start, end]);
      findings.push({ kind, value: text.slice(start, end), replacement: `[${kind}]`, index: start });
    }
  }
  findings.sort((a, b) => a.index - b.index);
  let masked = "";
  let cursor = 0;
  for (const f of findings) {
    masked += text.slice(cursor, f.index) + f.replacement;
    cursor = f.index + f.value.length;
  }
  masked += text.slice(cursor);
  return { masked, findings };
}
