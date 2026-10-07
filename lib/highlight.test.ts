import { describe, it, expect } from "vitest";
import { splitHighlights } from "./highlight";

describe("splitHighlights", () => {
  it("returns the whole text as one segment when there are no phrases", () => {
    expect(splitHighlights("plain text", [])).toEqual([{ text: "plain text" }]);
  });
  it("marks a phrase case-insensitively and keeps the original casing", () => {
    expect(splitHighlights("Pay the Dana Sukuk now", [{ text: "dana sukuk", tone: "ok" }]))
      .toEqual([{ text: "Pay the " }, { text: "Dana Sukuk", tone: "ok" }, { text: " now" }]);
  });
  it("marks every occurrence", () => {
    expect(splitHighlights("QCB and QCB", [{ text: "QCB", tone: "ok" }]))
      .toEqual([{ text: "QCB", tone: "ok" }, { text: " and " }, { text: "QCB", tone: "ok" }]);
  });
  it("first listed phrase wins where phrases overlap", () => {
    expect(splitHighlights("Dana Sukuk Certificates", [{ text: "Dana Sukuk Certificates", tone: "ok" }, { text: "Sukuk", tone: "block" }]))
      .toEqual([{ text: "Dana Sukuk Certificates", tone: "ok" }]);
  });
  it("ignores empty phrases", () => {
    expect(splitHighlights("abc", [{ text: "", tone: "ok" }])).toEqual([{ text: "abc" }]);
  });
});
