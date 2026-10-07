import { describe, it, expect } from "vitest";
import { findLeaks } from "./leak";

describe("findLeaks", () => {
  const reg = [{ label: "Ahmed Al-Sulaiti salary", value: "QAR 38,500" }, { label: "Noora Al-Thani salary", value: "QAR 52,000" }];
  it("finds a confidential value even with different thousands formatting", () => {
    expect(findLeaks("Ahmed earns QAR 38500 per month.", reg).map((l) => l.label)).toEqual(["Ahmed Al-Sulaiti salary"]);
  });
  it("finds a value written without the currency prefix", () => {
    expect(findLeaks("His monthly pay is 38,500.", reg)).toHaveLength(1);
  });
  it("ignores unrelated numbers", () => {
    expect(findLeaks("The band is QAR 30,000 to 45,000.", reg)).toHaveLength(0);
  });
});
