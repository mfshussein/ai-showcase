import { describe, it, expect } from "vitest";
import { stamp } from "./stamp";
import type { RunEventInput } from "./events";

describe("stamp", () => {
  it("adds t relative to the first event and applies schema defaults", async () => {
    let now = 1000;
    const clock = () => now;
    async function* gen(): AsyncGenerator<RunEventInput> {
      yield { type: "act.start", act: 1, title: "a" };
      now = 1250;
      yield { type: "pause" };
    }
    const out = [];
    for await (const e of stamp(gen(), clock)) out.push(e);
    expect(out.map((e) => e.t)).toEqual([0, 250]);
    expect(out[0]).toMatchObject({ keep: [] });
  });
  it("rejects an invalid event from the runner", async () => {
    async function* gen(): AsyncGenerator<RunEventInput> { yield { type: "panel", id: "x", kind: "nope" as never, props: {} }; }
    await expect((async () => { for await (const e of stamp(gen())) void e; })()).rejects.toThrow();
  });
});
