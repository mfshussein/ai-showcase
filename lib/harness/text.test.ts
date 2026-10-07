import { describe, it, expect } from "vitest";
import { normalizeText, sha256Hex, nearDuplicate } from "./text";

describe("text harness", () => {
  it("normalizes whitespace and case", () => { expect(normalizeText("  A  b\n\nC ")).toBe("a b c"); });
  it("hashes deterministically", () => {
    expect(sha256Hex("x")).toBe(sha256Hex("x"));
    expect(sha256Hex("x")).not.toBe(sha256Hex("y"));
    expect(sha256Hex("x")).toHaveLength(64);
  });
  it("flags a lightly edited copy as a duplicate", () => {
    const a = "This policy sets out how the airline supports customers travelling because of the death of an immediate family member. Immediate family means spouse, parent, child, sibling, grandparent or grandchild. A discount of up to 30% applies to the lowest available economy fare on the day of booking.";
    const b = a.replace("up to 30%", "up to thirty percent").replace("sets out", "sets   out") + "\n";
    const r = nearDuplicate(a, b);
    expect(r.duplicate).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(0.9);
  });
  it("does not flag a genuinely different document", () => {
    const a = "Bereavement fares must be requested before travel. Refund requests submitted after travel has taken place will not be approved.";
    const b = "Our IT acceptable use policy forbids personal devices on the corporate network and requires encryption on all laptops.";
    expect(nearDuplicate(a, b).duplicate).toBe(false);
    expect(nearDuplicate(a, b).score).toBeLessThan(0.5);
  });
});
