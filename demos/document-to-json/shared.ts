import { z } from "zod";
import { vatCheck, idChecks, confidenceFlags, type Check } from "@/lib/harness/doc-checks";

/** The demo's "today": fixed so the ID card's expiry check is stable across recordings. */
export const TODAY = "2026-10-07";

const F = z.object({ value: z.union([z.string(), z.number(), z.null()]), confidence: z.number().min(0).max(1) });
export type Field = z.infer<typeof F>;

export const Invoice = z.object({ supplier: F, invoiceNumber: F, date: F, currency: F, subtotal: F, vatRate: F, vat: F, total: F });
export const IdCard = z.object({ idNumber: F, nameEnglish: F, nameArabic: F, dateOfBirth: F, expiry: F, nationality: F });
export const DeliveryNote = z.object({
  noteNumber: F, date: F, deliverTo: F, receivedBy: F,
  lines: z.array(z.object({ item: F, qty: F, unit: F })),
});

export const num = (f: Field | undefined): number => Number(String(f?.value ?? "NaN").replace(/[^0-9.\-]/g, ""));
const str = (f: Field | undefined): string => String(f?.value ?? "");

/** Flattens a record of fields (including line arrays) into path → field. */
export function flatten(rec: Record<string, unknown>, prefix = ""): Record<string, Field> {
  const out: Record<string, Field> = {};
  for (const [k, v] of Object.entries(rec)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) v.forEach((x, i) => Object.assign(out, flatten(x as Record<string, unknown>, `${p}[${i}]`)));
    else if (v && typeof v === "object" && "confidence" in v) out[p] = v as Field;
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
    checks: (r) => [...vatCheck({ subtotal: num(r.subtotal as Field), vatRate: num(r.vatRate as Field), vat: num(r.vat as Field), total: num(r.total as Field) }), ...confidenceFlags(flatten(r as Record<string, unknown>))],
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
