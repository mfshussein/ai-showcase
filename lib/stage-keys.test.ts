import { describe, it, expect } from "vitest";
import { stageKeyAction } from "./stage-keys";

const k = (key: string, extra: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean; repeat: boolean; tag: string }> = {}) =>
  stageKeyAction({ key, metaKey: false, ctrlKey: false, altKey: false, repeat: false, targetTag: "BODY", ...("tag" in extra ? { targetTag: extra.tag! } : {}), ...extra });

describe("stageKeyAction", () => {
  it("maps the presenter keys", () => {
    expect(k(" ")).toBe("next");
    expect(k("ArrowRight")).toBe("next");
    expect(k("Enter")).toBe("next");
    expect(k("ArrowLeft")).toBe("back");
    expect(k("e")).toBe("evidence");
    expect(k("L")).toBe("live");
    expect(k("Escape")).toBe("escape");
    expect(k("x")).toBeNull();
  });
  it("ignores modifier combinations and key repeats", () => {
    expect(k("l", { metaKey: true })).toBeNull();
    expect(k("ArrowLeft", { metaKey: true })).toBeNull();
    expect(k(" ", { ctrlKey: true })).toBeNull();
    expect(k(" ", { repeat: true })).toBeNull();
  });
  it("ignores keys while a form field, button or link has focus", () => {
    expect(k(" ", { tag: "BUTTON" })).toBeNull();
    expect(k("Enter", { tag: "A" })).toBeNull();
    expect(k("e", { tag: "INPUT" })).toBeNull();
    expect(k("Escape", { tag: "BUTTON" })).toBe("escape");
  });
});
