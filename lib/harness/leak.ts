export interface ConfidentialValue { label: string; value: string }

const canon = (s: string) => s.toLowerCase().replace(/[,\s]/g, "");
const core = (s: string) => canon(s).replace(/^(qar|usd|sar|aed|eur|gbp)/, "");

/** Finds confidential register values that appear in a model's output, ignoring spacing, commas and currency prefixes. */
export function findLeaks(output: string, register: ConfidentialValue[]): ConfidentialValue[] {
  const o = canon(output);
  return register.filter((r) => { const c = core(r.value); return c.length >= 4 && o.includes(c); });
}
