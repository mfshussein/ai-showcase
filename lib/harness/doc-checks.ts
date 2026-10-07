/** Deterministic validation of extracted document fields. The model reads; code decides what goes downstream. */
export type Check = { field: string; rule: string; ok: boolean; tone: "ok" | "warn" | "block"; message: string };

const qar = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const close = (a: number, b: number) => Math.abs(a - b) <= 0.01 + 1e-9;
const check = (field: string, rule: string, ok: boolean, okMsg: string, badMsg: string, bad: Check["tone"] = "block"): Check =>
  ({ field, rule, ok, tone: ok ? "ok" : bad, message: ok ? okMsg : badMsg });

export function vatCheck(i: { subtotal: number; vatRate: number; vat: number; total: number }): Check[] {
  const expectedVat = Math.round(i.subtotal * i.vatRate * 100) / 100;
  return [
    check("vat", "vat", close(i.vat, expectedVat), `VAT ${qar(i.vat)} is ${i.vatRate * 100}% of ${qar(i.subtotal)}`, `VAT printed ${qar(i.vat)}, but ${i.vatRate * 100}% of ${qar(i.subtotal)} is ${qar(expectedVat)}`),
    check("total", "total", close(i.total, i.subtotal + i.vat), `Total ${qar(i.total)} = subtotal + VAT`, `Total printed ${qar(i.total)}, but subtotal + VAT is ${qar(i.subtotal + i.vat)}`),
  ];
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Qatar ID: 11 digits; first digit 2 (born 19xx) or 3 (born 20xx); digits 2-3 are the birth year's last two digits. */
export function idChecks(i: { idNumber: string; dateOfBirth: string; expiry: string }, today: string): Check[] {
  const digits = i.idNumber.replace(/\s/g, "");
  const year = isDate(i.dateOfBirth) ? i.dateOfBirth.slice(0, 4) : "";
  const structureOk = /^\d{11}$/.test(digits) && year !== "" && digits[0] === (year.startsWith("19") ? "2" : "3") && digits.slice(1, 3) === year.slice(2);
  const expiryOk = isDate(i.expiry) && i.expiry >= today;
  return [
    check("idNumber", "structure", structureOk, "11 digits, century and birth year match the date of birth", "Number does not match the ID structure for this date of birth"),
    check("expiry", "expiry", expiryOk, `Valid until ${i.expiry}`, isDate(i.expiry) ? `Expired on ${i.expiry}` : "Expiry date unreadable"),
  ];
}

export function confidenceFlags(fields: Record<string, { value: unknown; confidence: number }>, floor = 0.8): Check[] {
  return Object.entries(fields).flatMap(([field, f]) => {
    if (f.value === null || f.value === undefined || f.value === "") return [{ field, rule: "readable", ok: false, tone: "warn" as const, message: "Unreadable: human check" }];
    if (f.confidence < floor) return [{ field, rule: "confidence", ok: false, tone: "warn" as const, message: `Confidence ${Math.round(f.confidence * 100)}%: human check` }];
    return [];
  });
}

export function recordVerdict(checks: Check[]): "RELEASED" | "HUMAN CHECK" | "BLOCKED" {
  if (checks.some((c) => c.tone === "block")) return "BLOCKED";
  if (checks.some((c) => c.tone === "warn")) return "HUMAN CHECK";
  return "RELEASED";
}
