import { describe, it, expect } from "vitest";
import { demos, getDemo } from "./registry";
import { goldens } from "./goldens";
import { runners } from "./runners";
import { parseGolden } from "@/lib/events";

describe("registry", () => {
  it("has unique slugs and ascending order", () => {
    const slugs = demos.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(demos.map((d) => d.order)).toEqual([...demos.map((d) => d.order)].sort((a, b) => a - b));
  });
  it("getDemo finds by slug", () => {
    for (const d of demos) expect(getDemo(d.slug)).toBe(d);
    expect(getDemo("nope")).toBeUndefined();
  });
  it("every ready demo has a runner and a valid golden whose acts match the manifest", () => {
    for (const d of demos.filter((d) => d.status === "ready")) {
      expect(runners[d.slug], `runner for ${d.slug}`).toBeTypeOf("function");
      const g = parseGolden(goldens[d.slug]);
      const acts = g.events.flatMap((e) => (e.type === "act.start" ? [e.act] : []));
      expect(acts, d.slug).toEqual(d.acts.map((a) => a.act));
      expect(g.demo).toBe(d.slug);
    }
  });
});
