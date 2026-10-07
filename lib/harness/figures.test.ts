import { describe, it, expect } from "vitest";
import { extractFigures, traceFigures } from "./figures";

describe("extractFigures", () => {
  it("pulls integers, decimals, percentages and thousands-separated numbers", () => {
    expect(extractFigures("Tower C collected 41% of QAR 11.4 million; 12,904 orders")).toEqual(["41", "11.4", "12904"]);
  });
  it("converts Arabic-Indic digits", () => {
    expect(extractFigures("نسبة ٨٢٪")).toEqual(["82"]);
  });
  it("ignores four-digit years and de-duplicates", () => {
    expect(extractFigures("September 2026: 41% and again 41%")).toEqual(["41"]);
  });
});

describe("traceFigures", () => {
  it("splits quoted figures into found on the source and not found", () => {
    const source = "bars [93, 91, 41, 89, 90] occupancy 82% down 9 points 11.4 مليون";
    expect(traceFigures(["41", "82", "52", "11.4"], source)).toEqual({ found: ["41", "82", "11.4"], notFound: ["52"] });
  });
  it("matches 82.0 against 82 and does not match 4 inside 41", () => {
    expect(traceFigures(["82.0", "4"], "value 82 and 41")).toEqual({ found: ["82.0"], notFound: ["4"] });
  });
});
