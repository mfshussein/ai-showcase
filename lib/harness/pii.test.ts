import { describe, it, expect } from "vitest";
import { maskPii } from "./pii";

describe("maskPii", () => {
  it("masks a Qatar ID, phone, IBAN and email, in input order", () => {
    const r = maskPii("Fatima, QID 28845612345, mobile +974 5512 3456, IBAN QA58DOHB00001234567890ABCDEFG, fatima.k@example.com");
    expect(r.masked).toBe("Fatima, QID [QID], mobile [PHONE], IBAN [IBAN], [EMAIL]");
    expect(r.findings.map((f) => f.kind)).toEqual(["QID", "PHONE", "IBAN", "EMAIL"]);
  });
  it("masks Arabic-Indic digit Qatar IDs", () => {
    const r = maskPii("الرقم الشخصي ٢٨٨٤٥٦١٢٣٤٥ للموظفة");
    expect(r.masked).toContain("[QID]");
    expect(r.findings[0]).toMatchObject({ kind: "QID", value: "٢٨٨٤٥٦١٢٣٤٥" });
  });
  it("leaves an 11-digit number that is not a QID (starts with 1)", () => {
    expect(maskPii("ref 18845612345").findings).toEqual([]);
  });
  it("does not treat an IBAN's digits as a phone or QID", () => {
    const r = maskPii("QA58DOHB00001234567890ABCDEFG");
    expect(r.findings.map((f) => f.kind)).toEqual(["IBAN"]);
  });
  it("does not swallow a sentence's full stop after an email", () => {
    const r = maskPii("Write to fatima.k@example.com. Thanks.");
    expect(r.masked).toBe("Write to [EMAIL]. Thanks.");
    expect(r.findings[0].value).toBe("fatima.k@example.com");
  });
  it("returns the text unchanged when nothing matches", () => {
    expect(maskPii("How many days of annual leave do I get?").masked).toBe("How many days of annual leave do I get?");
  });
});
