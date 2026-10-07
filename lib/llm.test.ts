import { describe, it, expect } from "vitest";
import { costUsd } from "./llm";

describe("costUsd", () => {
  it("prices opus 5.5 at $4/$20 per MTok", () => { expect(costUsd("claude-opus-5-5", 1_000_000, 1_000_000)).toBeCloseTo(24); });
  it("prices sonnet 5.5 at $2/$10", () => { expect(costUsd("claude-sonnet-5-5", 500_000, 100_000)).toBeCloseTo(2); });
  it("unknown model costs 0", () => { expect(costUsd("x", 1, 1)).toBe(0); });
});
