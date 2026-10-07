/** A synthetic accounts-payable ledger and access log, generated from a seed, with five issues planted for the night watchman. */
import type { FlagKind } from "./anomalies";

export type Payment = { id: string; date: string; vendor: string; invoice: string; amount: number; approver: string };
/** `at` is Qatar local time, ISO without a zone: YYYY-MM-DDTHH:MM:SS. */
export type Login = { id: string; at: string; user: string; role: "admin" | "clerk"; ip: string };
export type Ledger = { payments: Payment[]; logins: Login[]; planted: Record<FlagKind, string[]> };

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Typical invoice sizes in QAR. Bounded ±25% noise keeps every normal invoice under 40,000 and within 2 sd of its vendor's mean. */
export const VENDORS: { name: string; mean: number }[] = [
  { name: "Al Waab Catering", mean: 18500 }, { name: "Lusail Facility Services", mean: 26000 }, { name: "Pearl Coast Logistics", mean: 14200 },
  { name: "Doha Office Supplies", mean: 3200 }, { name: "Al Sadd Printing", mean: 5400 }, { name: "Corniche Cleaning Co.", mean: 9800 },
  { name: "Al Khor Marine Supplies", mean: 21000 }, { name: "Wakra Fresh Foods", mean: 7600 }, { name: "Simaisma Security", mean: 24500 },
  { name: "Dukhan Engineering", mean: 30000 }, { name: "Rayyan Fleet Rentals", mean: 12800 }, { name: "Old Airport Auto Parts", mean: 4100 },
  { name: "Salwa Road Electricals", mean: 8900 }, { name: "Gharrafa Landscaping", mean: 6700 }, { name: "Umm Salal Water Co.", mean: 2300 },
  { name: "West Bay Legal Advisory", mean: 28000 }, { name: "Abu Hamour Steel Traders", mean: 29500 }, { name: "Mesaieed Chemicals Trading", mean: 16400 },
  { name: "Al Dafna Travel", mean: 11300 }, { name: "Najma Telecom Services", mean: 8200 },
];
const APPROVERS = ["H. Al-Marri", "S. Haddad", "R. Pillai", "M. Kassem"];
const START = Date.UTC(2026, 3, 1); // 1 April 2026
const END = Date.UTC(2026, 9, 6); // 6 October 2026
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const working = (ms: number) => { const d = new Date(ms).getUTCDay(); return d !== 5 && d !== 6; };
const round2 = (n: number) => Math.round(n * 100) / 100;

export function generateLedger(seed = 2026, opts: { plant?: boolean } = {}): Ledger {
  const plant = opts.plant ?? true;
  const rnd = mulberry32(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const workDays: number[] = [];
  for (let t = START; t <= END; t += DAY) if (working(t)) workDays.push(t);
  let inv = 10000;
  const payments: Payment[] = [];
  const normalCount = plant ? 493 : 500; // planted rows: 1 duplicate, 1 fuzzy, 1 outlier, 3 split = 6, plus the outlier vendor's extra history row
  const mk = (date: string, vendor: string, amount: number): Payment => ({ id: "", date, vendor, invoice: `INV-${inv++}`, amount: round2(amount), approver: pick(APPROVERS) });
  for (let i = 0; i < normalCount; i++) {
    const v = pick(VENDORS);
    payments.push(mk(iso(pick(workDays)), v.name, v.mean * (0.75 + rnd() * 0.5)));
  }
  const planted = { "exact-duplicate": [], "fuzzy-duplicate": [], outlier: [], "split-invoice": [], "off-hours-login": [] } as Record<FlagKind, string[]>;
  const tag = (p: Payment, kind: FlagKind) => { planted[kind].push(p.invoice); return p; };
  if (plant) {
    // Exact duplicate: the same invoice paid twice.
    const orig = payments[Math.floor(rnd() * 100)];
    tag(orig, "exact-duplicate");
    payments.push(tag({ ...orig, approver: pick(APPROVERS) }, "exact-duplicate"));
    // Fuzzy duplicate: same vendor and amount two days later, re-keyed with a new invoice number.
    // Exactly two calendar days later, both on working days (Sunday to Tuesday originals).
    let fi = 100 + Math.floor(rnd() * 100);
    while (!working(Date.parse(`${payments[fi].date}T00:00:00Z`) + 2 * DAY)) fi++;
    const f0 = payments[fi];
    const f1day = Date.parse(`${f0.date}T00:00:00Z`) + 2 * DAY;
    tag(f0, "fuzzy-duplicate");
    payments.push(tag({ ...mk(iso(f1day), f0.vendor, f0.amount), amount: f0.amount }, "fuzzy-duplicate"));
    // Outlier: about six times this vendor's usual invoice (one extra normal row keeps the history deep).
    const ov = VENDORS[3];
    payments.push(mk(iso(pick(workDays)), ov.name, ov.mean));
    payments.push(tag(mk(iso(workDays[workDays.length - 3]), ov.name, ov.mean * 6.2), "outlier"));
    // Split invoices: three just under the QAR 50,000 approval threshold, same vendor, within three days.
    const sv = VENDORS[16];
    const s0 = workDays.length - 12;
    for (const [k, amt] of [[0, 48900], [1, 47350], [3, 49200]] as const) payments.push(tag(mk(iso(workDays[s0 + k]), sv.name, amt), "split-invoice"));
  }
  // Stable order by date, then ids by position.
  payments.sort((a, b) => a.date.localeCompare(b.date) || a.invoice.localeCompare(b.invoice));
  const idOf = new Map<Payment, string>();
  payments.forEach((p, i) => { p.id = `P-${String(i + 1).padStart(4, "0")}`; idOf.set(p, p.id); });
  for (const k of Object.keys(planted) as FlagKind[]) {
    if (k === "off-hours-login") continue;
    const invoices = planted[k];
    // Map planted invoice numbers to payment ids; the exact duplicate shares an invoice number, so take every row with it.
    planted[k] = payments.filter((p) => invoices.includes(p.invoice)).map((p) => p.id);
  }

  const users = [{ user: "h.almarri", role: "admin" as const }, { user: "it.ops", role: "admin" as const }, { user: "s.haddad", role: "clerk" as const }, { user: "r.pillai", role: "clerk" as const }, { user: "m.kassem", role: "clerk" as const }];
  const logins: Login[] = [];
  for (let i = 0; i < 160; i++) {
    const u = pick(users);
    const day = iso(pick(workDays));
    const hh = String(7 + Math.floor(rnd() * 11)).padStart(2, "0");
    const mm = String(Math.floor(rnd() * 60)).padStart(2, "0");
    logins.push({ id: "", at: `${day}T${hh}:${mm}:00`, user: u.user, role: u.role, ip: `10.20.${Math.floor(rnd() * 8)}.${10 + Math.floor(rnd() * 200)}` });
  }
  if (plant) logins.push({ id: "", at: "2026-10-03T03:12:00", user: "it.ops", role: "admin", ip: "203.0.113.47" });
  logins.sort((a, b) => a.at.localeCompare(b.at));
  logins.forEach((l, i) => { l.id = `L-${String(i + 1).padStart(4, "0")}`; });
  if (plant) planted["off-hours-login"] = logins.filter((l) => l.at === "2026-10-03T03:12:00").map((l) => l.id);
  return { payments, logins, planted };
}
