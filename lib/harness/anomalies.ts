/** The night watchman's engine: plain statistics, no model. Each row is explained by at most one flag. */
import type { Payment, Login } from "./ledger";

export const FLAG_KINDS = ["exact-duplicate", "fuzzy-duplicate", "split-invoice", "outlier", "off-hours-login"] as const;
export type FlagKind = (typeof FLAG_KINDS)[number];
export type Flag = { kind: FlagKind; ids: string[]; amount: number; vendor: string; detail: string };

const DAY = 86_400_000;
const dayMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function detectAnomalies(payments: Payment[], logins: Login[], opts: { threshold?: number; z?: number; windowDays?: number } = {}): Flag[] {
  const threshold = opts.threshold ?? 50000;
  const zLimit = opts.z ?? 3;
  const windowDays = opts.windowDays ?? 3;
  const used = new Set<string>();
  const flags: Flag[] = [];
  const add = (f: Flag) => { flags.push(f); f.ids.forEach((id) => used.add(id)); };

  // Exact duplicates: same vendor, invoice number and amount.
  const groups = new Map<string, Payment[]>();
  for (const p of payments) {
    const k = `${p.vendor}|${p.invoice}|${p.amount}`;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  for (const g of groups.values()) {
    if (g.length > 1) add({ kind: "exact-duplicate", ids: g.map((p) => p.id), amount: round2(g[0].amount * (g.length - 1)), vendor: g[0].vendor, detail: `Invoice ${g[0].invoice} paid ${g.length} times, QAR ${fmt(g[0].amount)} each` });
  }

  // Fuzzy duplicates: same vendor and amount, different invoice number, a few days apart.
  const byVendor = new Map<string, Payment[]>();
  for (const p of payments) byVendor.set(p.vendor, [...(byVendor.get(p.vendor) ?? []), p]);
  for (const list of byVendor.values()) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i], b = sorted[j];
        const gap = (dayMs(b.date) - dayMs(a.date)) / DAY;
        if (gap > windowDays) break;
        if (gap >= 1 && a.amount === b.amount && a.invoice !== b.invoice && !used.has(a.id) && !used.has(b.id)) {
          add({ kind: "fuzzy-duplicate", ids: [a.id, b.id], amount: b.amount, vendor: a.vendor, detail: `QAR ${fmt(a.amount)} paid on ${a.date} (${a.invoice}) and again on ${b.date} (${b.invoice})` });
        }
      }
    }
  }

  // Split invoices: several invoices from one vendor within a few days, each just under the approval threshold, together over it.
  for (const list of byVendor.values()) {
    const near = list.filter((p) => !used.has(p.id) && p.amount < threshold && p.amount >= threshold * 0.8).sort((a, b) => a.date.localeCompare(b.date));
    let i = 0;
    while (i < near.length) {
      let j = i;
      while (j + 1 < near.length && (dayMs(near[j + 1].date) - dayMs(near[i].date)) / DAY <= windowDays) j++;
      const win = near.slice(i, j + 1);
      const total = round2(win.reduce((s, p) => s + p.amount, 0));
      if (win.length >= 2 && total > threshold) {
        add({ kind: "split-invoice", ids: win.map((p) => p.id), amount: total, vendor: win[0].vendor, detail: `${win.length} invoices between ${win[0].date} and ${win.at(-1)!.date}, each under QAR ${fmt(threshold)}, together QAR ${fmt(total)}` });
        i = j + 1;
      } else i++;
    }
  }

  // Outliers: far above this vendor's own history.
  for (const list of byVendor.values()) {
    for (const p of list) {
      if (used.has(p.id)) continue;
      const hist = list.filter((x) => x.id !== p.id).map((x) => x.amount);
      if (hist.length < 5) continue;
      const mean = hist.reduce((s, x) => s + x, 0) / hist.length;
      const sd = Math.sqrt(hist.reduce((s, x) => s + (x - mean) ** 2, 0) / (hist.length - 1));
      const z = sd > 0 ? (p.amount - mean) / sd : 0;
      // Materiality floor: a statistically unusual invoice is only worth an alert if it is at least double the usual amount.
      if (z > zLimit && p.amount >= 2 * mean) add({ kind: "outlier", ids: [p.id], amount: p.amount, vendor: p.vendor, detail: `QAR ${fmt(p.amount)} against a usual QAR ${fmt(mean)} over ${hist.length} invoices (z = ${z.toFixed(1)})` });
    }
  }

  // Admin logins at the weekend (Friday, Saturday) or at night.
  for (const l of logins) {
    const day = new Date(`${l.at.slice(0, 10)}T00:00:00Z`).getUTCDay();
    const hour = Number(l.at.slice(11, 13));
    if (l.role === "admin" && (day === 5 || day === 6 || hour < 6 || hour >= 22)) {
      add({ kind: "off-hours-login", ids: [l.id], amount: 0, vendor: "", detail: `Admin account ${l.user} logged in ${DAYS[day]} ${l.at.slice(11, 16)} from ${l.ip}` });
    }
  }

  return FLAG_KINDS.flatMap((k) => flags.filter((f) => f.kind === k));
}
