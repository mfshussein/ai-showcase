/** Snap a model-located box to the dashboard tile it points at, so callouts are drawn on clean, known boundaries. */
export type Box = { x: number; y: number; w: number; h: number };
export type Tile = Box & { id: string; title: string };

/** Accepts percent boxes, fraction boxes (all values at most 1) or pixel boxes (when the image size is given). */
function toPercent(b: Box, size?: { width: number; height: number }): Box {
  const vals = [b.x, b.y, b.w, b.h];
  if (vals.every((v) => v <= 1)) return { x: b.x * 100, y: b.y * 100, w: b.w * 100, h: b.h * 100 };
  if (size && vals.some((v) => v > 100)) return { x: (b.x / size.width) * 100, y: (b.y / size.height) * 100, w: (b.w / size.width) * 100, h: (b.h / size.height) * 100 };
  return b;
}

export function snapToTile(box: Box, tiles: Tile[], size?: { width: number; height: number }): Tile | null {
  if (![box.x, box.y, box.w, box.h].every(Number.isFinite) || box.w <= 0 || box.h <= 0) return null;
  const b = toPercent(box, size);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return tiles.find((t) => cx >= t.x && cx <= t.x + t.w && cy >= t.y && cy <= t.y + t.h) ?? null;
}
