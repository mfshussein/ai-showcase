import { z } from "zod";
import type { FlagKind } from "@/lib/harness/anomalies";

export const COMPANY = "Marsa Holdings AP";
export const LEDGER_SEED = 2026;
export const KIND_LABEL: Record<FlagKind, string> = {
  "exact-duplicate": "Exact duplicate",
  "fuzzy-duplicate": "Near-duplicate",
  "split-invoice": "Split invoices",
  outlier: "Unusual amount",
  "off-hours-login": "Off-hours admin login",
};

export const Notes = z.object({ notes: z.array(z.object({ id: z.string(), en: z.string(), ar: z.string(), action: z.string() })) });

export { maskEmail } from "@/lib/notify";

export function qatarTime(d = new Date()): string {
  return d.toLocaleTimeString("en-GB", { timeZone: "Asia/Qatar", hour: "2-digit", minute: "2-digit" });
}
