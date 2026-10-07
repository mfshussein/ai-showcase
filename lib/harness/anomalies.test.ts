import { describe, it, expect } from "vitest";
import { generateLedger } from "./ledger";
import { detectAnomalies, FLAG_KINDS } from "./anomalies";

describe("generateLedger", () => {
  it("is deterministic for a seed and has 500 payments", () => {
    const a = generateLedger(2026);
    const b = generateLedger(2026);
    expect(a.payments).toHaveLength(500);
    expect(a).toEqual(b);
    expect(generateLedger(7).payments).not.toEqual(a.payments);
  });
  it("pays only on Qatari working days (Sunday to Thursday)", () => {
    const days = new Set(generateLedger(2026).payments.map((p) => new Date(`${p.date}T00:00:00Z`).getUTCDay()));
    expect(days.has(5) || days.has(6)).toBe(false);
  });
});

describe("detectAnomalies", () => {
  it("finds exactly the planted issues, one flag per kind, with the planted ids", () => {
    const { payments, logins, planted } = generateLedger(2026);
    const flags = detectAnomalies(payments, logins);
    expect(flags.map((f) => f.kind)).toEqual([...FLAG_KINDS]);
    for (const f of flags) expect([...f.ids].sort(), f.kind).toEqual([...planted[f.kind]].sort());
  });
  it("finds the planted issues for other seeds too", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { payments, logins } = generateLedger(seed);
      expect(detectAnomalies(payments, logins).map((f) => f.kind), `seed ${seed}`).toEqual([...FLAG_KINDS]);
    }
  });
  it("finds nothing in a clean ledger", () => {
    const { payments, logins } = generateLedger(2026, { plant: false });
    expect(detectAnomalies(payments, logins)).toEqual([]);
  });
  it("counts the money at risk: the duplicate payment, the outlier, and the split total", () => {
    const { payments, logins } = generateLedger(2026);
    const flags = detectAnomalies(payments, logins);
    const byId = new Map(payments.map((p) => [p.id, p]));
    const split = flags.find((f) => f.kind === "split-invoice")!;
    expect(split.amount).toBeCloseTo(split.ids.reduce((s, id) => s + byId.get(id)!.amount, 0), 2);
    expect(split.amount).toBeGreaterThan(50000);
    expect(split.ids.every((id) => byId.get(id)!.amount < 50000)).toBe(true);
    expect(flags.find((f) => f.kind === "off-hours-login")!.amount).toBe(0);
  });
  it("flags an admin login at 03:00 on a Saturday", () => {
    const { payments, logins, planted } = generateLedger(2026);
    const login = logins.find((l) => l.id === planted["off-hours-login"][0])!;
    expect(login.role).toBe("admin");
    expect(login.at.slice(11, 13)).toBe("03");
    expect(detectAnomalies(payments, logins).find((f) => f.kind === "off-hours-login")!.detail).toMatch(/Saturday 03:/);
  });
});

describe("outlier materiality", () => {
  it("does not flag a high z-score that is less than double the vendor's usual amount", () => {
    const base = [100, 101, 99, 100.5, 99.5, 100.2, 99.8, 100.4];
    const payments = [...base, 140].map((amount, i) => ({ id: `P-${i}`, date: `2026-05-${String(i + 3).padStart(2, "0")}`, vendor: "V", invoice: `I-${i}`, amount, approver: "a" }));
    expect(detectAnomalies(payments, [])).toEqual([]);
  });
});
