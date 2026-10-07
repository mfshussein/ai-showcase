import { describe, it, expect } from "vitest";
import { diffMode } from "./diff-mode";

describe("diffMode", () => {
  it("uses a word diff when most words are shared", () => {
    expect(diffMode("must be provided within 14 days of booking", "must be provided within 30 days of booking")).toBe("words");
  });
  it("highlights quotes instead when the sentences were rewritten", () => {
    expect(diffMode(
      "A customer who travels before applying may submit a request for a bereavement refund within 90 days of the ticket issue date.",
      "Bereavement fares must be requested before travel. Refund requests submitted after travel has taken place will not be approved.",
    )).toBe("highlight");
  });
});
