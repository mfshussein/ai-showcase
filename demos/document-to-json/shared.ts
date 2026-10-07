import { z } from "zod";
import { vatCheck, idChecks, confidenceFlags, type Check } from "@/lib/harness/doc-checks";

/** The demo's "today": fixed so the ID card's expiry check is stable across recordings. */
export const TODAY = "2026-10-07";

/** Tolerant on purpose: missing values and 0-100 confidences are normalised by the runner, not rejected mid-run. */
const F = z.object({ value: z.union([z.string(), z.number(), z.null()]).optional(), confidence: z.number().optional() });
export type Field = { value: string | number | null | undefined; confidence: number };

export const Invoice = z.object({ supplier: F, invoiceNumber: F, date: F, currency: F, subtotal: F, vatRate: F, vat: F, total: F }).partial();
export const IdCard = z.object({ idNumber: F, nameEnglish: F, nameArabic: F, dateOfBirth: F, expiry: F, nationality: F }).partial();
export const DeliveryNote = z.object({
  noteNumber: F, date: F, deliverTo: F, receivedBy: F,
  lines: z.array(z.object({ item: F, qty: F, unit: F }).partial()),
}).partial();

/** Confidence as a fraction: 96 becomes 0.96, missing becomes 0 (so it goes to a human). */
export function normaliseConfidence(c: unknown): number {
  const n = typeof c === "number" && Number.isFinite(c) ? c : 0;
  return Math.min(1, Math.max(0, n > 1 ? n / 100 : n));
}

/** Reads a number from a field; empty or unreadable is NaN, never 0. */
export const num = (f: Field | undefined): number => {
  const s = String(f?.value ?? "").replace(/[^0-9.\-]/g, "");
  return s === "" ? Number.NaN : Number(s);
};

function invoiceChecks(r: Record<string, Field | unknown>): Check[] {
  const [subtotal, vat, total] = [num(r.subtotal as Field), num(r.vat as Field), num(r.total as Field)];
  let vatRate = num(r.vatRate as Field);
  if (vatRate > 1) vatRate /= 100;
  if (![subtotal, vatRate, vat, total].every(Number.isFinite)) {
    return [{ field: "total", rule: "readable", ok: false, tone: "warn", message: "Could not read the subtotal, VAT rate, VAT or total: human check" }];
  }
  return vatCheck({ subtotal, vatRate, vat, total });
}
const str = (f: Field | undefined): string => String(f?.value ?? "");

/** Flattens a record of fields (including line arrays) into path → field. */
export function flatten(rec: Record<string, unknown>, prefix = ""): Record<string, Field> {
  const out: Record<string, Field> = {};
  for (const [k, v] of Object.entries(rec)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) v.forEach((x, i) => Object.assign(out, flatten(x as Record<string, unknown>, `${p}[${i}]`)));
    else if (v && typeof v === "object" && ("confidence" in v || "value" in v)) {
      const f = v as { value?: Field["value"]; confidence?: unknown };
      out[p] = { value: f.value ?? null, confidence: normaliseConfidence(f.confidence) };
    }
  }
  return out;
}

export type Doc = {
  key: "invoice" | "id" | "note"; file: string; title: string; schema: z.ZodType; prompt: string;
  checks: (rec: Record<string, Field | unknown>) => Check[];
};

const CONFIDENCE = "For every field return { value, confidence }. confidence is your honest probability (0 to 1) that the value is exactly right. If characters are overwritten, ambiguous or smudged, give your best reading and a confidence below 0.7. Use null when a field is not on the document. Dates as YYYY-MM-DD. Numbers without currency or thousands separators.";

export const DOCS: Doc[] = [
  {
    key: "invoice", file: "invoice.png", title: "Tax invoice, Dubai supplier",
    schema: Invoice,
    prompt: `Extract this tax invoice. vatRate as a fraction (5% is 0.05). Read the printed figures exactly; do not correct them. ${CONFIDENCE}`,
    checks: (r) => [...invoiceChecks(r), ...confidenceFlags(flatten(r as Record<string, unknown>))],
  },
  {
    key: "id", file: "qatar-id-specimen.png", title: "Residency card (SPECIMEN)",
    schema: IdCard,
    prompt: `Extract this specimen identity card. The ID number as printed digits. Dates on the card are DD/MM/YYYY; convert to YYYY-MM-DD. ${CONFIDENCE}`,
    checks: (r) => [...idChecks({ idNumber: str(r.idNumber as Field), dateOfBirth: str(r.dateOfBirth as Field), expiry: str(r.expiry as Field) }, TODAY), ...confidenceFlags(flatten(r as Record<string, unknown>))],
  },
  {
    key: "note", file: "delivery-note.png", title: "Handwritten delivery note",
    schema: DeliveryNote,
    prompt: `Extract this handwritten delivery note, one entry in lines per item row. Dates are DD/MM/YYYY; convert to YYYY-MM-DD. ${CONFIDENCE}`,
    checks: (r) => confidenceFlags(flatten(r as Record<string, unknown>)),
  },
];
