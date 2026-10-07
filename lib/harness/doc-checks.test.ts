import { describe, it, expect } from "vitest";
import { vatCheck, idChecks, confidenceFlags, recordVerdict, type Check } from "./doc-checks";

describe("vatCheck", () => {
  it("passes a consistent invoice", () => {
    expect(vatCheck({ subtotal: 12400, vatRate: 0.05, vat: 620, total: 13020 }).every((c) => c.ok)).toBe(true);
  });
  it("blocks VAT that is not the rate times the subtotal", () => {
    const vat = vatCheck({ subtotal: 12400, vatRate: 0.05, vat: 680, total: 13080 }).find((c) => c.rule === "vat");
    expect(vat).toMatchObject({ ok: false, tone: "block" });
    expect(vat?.message).toContain("620.00");
  });
  it("blocks a total that is not subtotal plus printed VAT", () => {
    const total = vatCheck({ subtotal: 12400, vatRate: 0.05, vat: 680, total: 13120 }).find((c) => c.rule === "total");
    expect(total).toMatchObject({ ok: false, tone: "block" });
  });
  it("tolerates rounding within 0.01", () => {
    expect(vatCheck({ subtotal: 100.1, vatRate: 0.05, vat: 5.01, total: 105.11 }).every((c) => c.ok)).toBe(true);
  });
});

describe("idChecks", () => {
  const today = "2026-10-07";
  it("blocks an expired card", () => {
    expect(idChecks({ idNumber: "28563400123", dateOfBirth: "1985-06-02", expiry: "2025-03-14" }, today).find((c) => c.rule === "expiry")).toMatchObject({ ok: false, tone: "block" });
  });
  it("passes structure when the number has 11 digits and digits 2-3 are the birth year", () => {
    expect(idChecks({ idNumber: "28563400123", dateOfBirth: "1985-06-02", expiry: "2029-01-01" }, today).every((c) => c.ok)).toBe(true);
  });
  it("blocks a number whose birth-year digits disagree with the date of birth", () => {
    expect(idChecks({ idNumber: "29063400123", dateOfBirth: "1985-06-02", expiry: "2029-01-01" }, today).find((c) => c.rule === "structure")).toMatchObject({ ok: false });
  });
  it("blocks a number that is not 11 digits, ignoring spaces", () => {
    expect(idChecks({ idNumber: "285 634 001 23", dateOfBirth: "1985-06-02", expiry: "2029-01-01" }, today).find((c) => c.rule === "structure")?.ok).toBe(true);
    expect(idChecks({ idNumber: "2856340012", dateOfBirth: "1985-06-02", expiry: "2029-01-01" }, today).find((c) => c.rule === "structure")?.ok).toBe(false);
  });
  it("blocks an unreadable expiry date", () => {
    expect(idChecks({ idNumber: "28563400123", dateOfBirth: "1985-06-02", expiry: "unclear" }, today).find((c) => c.rule === "expiry")?.ok).toBe(false);
  });
});

describe("confidenceFlags", () => {
  it("flags fields below the floor amber and unreadable fields amber", () => {
    const flags = confidenceFlags({ a: { value: "x", confidence: 0.95 }, b: { value: "17", confidence: 0.62 }, c: { value: null, confidence: 0.9 } });
    expect(flags.map((f) => [f.field, f.tone])).toEqual([["b", "warn"], ["c", "warn"]]);
  });
});

describe("recordVerdict", () => {
  const c = (tone: Check["tone"]): Check => ({ field: "f", rule: "r", ok: tone === "ok", tone, message: "" });
  it("block beats warn beats ok", () => {
    expect(recordVerdict([c("ok"), c("warn"), c("block")])).toBe("BLOCKED");
    expect(recordVerdict([c("ok"), c("warn")])).toBe("HUMAN CHECK");
    expect(recordVerdict([c("ok")])).toBe("RELEASED");
  });
});
