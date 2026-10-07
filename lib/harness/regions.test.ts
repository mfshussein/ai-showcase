import { describe, it, expect } from "vitest";
import { snapToTile, type Tile } from "./regions";

const tiles: Tile[] = [
  { id: "kpi", title: "KPI", x: 0, y: 0, w: 50, h: 20 },
  { id: "chart", title: "Chart", x: 50, y: 0, w: 50, h: 60 },
];

describe("snapToTile", () => {
  it("returns the tile containing the box centre", () => {
    expect(snapToTile({ x: 60, y: 10, w: 10, h: 10 }, tiles)?.id).toBe("chart");
  });
  it("returns null when the centre is outside every tile", () => {
    expect(snapToTile({ x: 10, y: 80, w: 5, h: 5 }, tiles)).toBeNull();
  });
  it("returns null for non-finite or negative-size boxes", () => {
    expect(snapToTile({ x: Number.NaN, y: 1, w: 1, h: 1 }, tiles)).toBeNull();
    expect(snapToTile({ x: 10, y: 10, w: -4, h: 2 }, tiles)).toBeNull();
  });
  it("treats boxes given as fractions (all values at most 1) as percent", () => {
    expect(snapToTile({ x: 0.6, y: 0.1, w: 0.1, h: 0.1 }, tiles)?.id).toBe("chart");
  });
  it("reads pixel boxes when the image size is given", () => {
    expect(snapToTile({ x: 800, y: 100, w: 100, h: 100 }, tiles, { width: 1280, height: 800 })?.id).toBe("chart");
  });
});
