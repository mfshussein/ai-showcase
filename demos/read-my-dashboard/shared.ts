import { z } from "zod";

export const DASHBOARDS = [
  { name: "sales-by-region", caption: "Sales by region, Q3" },
  { name: "cash-position", caption: "Group cash position, week 40" },
  { name: "call-centre-sla", caption: "Contact centre service levels" },
  { name: "collections-ar", caption: "لوحة التحصيل والإشغال (Arabic)" },
] as const;
export const PICK = "collections-ar";
export const src = (name: string) => `/fixtures/read-my-dashboard/${name}.png`;

const Box = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });
/** Deliberately tolerant: the runner trims counts and drops bad boxes, so imperfect output degrades instead of aborting the run. */
export const Reading = z.object({
  cfoLines: z.array(z.string()),
  anomalies: z.array(z.object({ label: z.string(), why: z.string(), box: z.unknown() })),
  questions: z.array(z.string()),
});

/** Accepts [x_min, y_min, x_max, y_max] on a 0-1000 scale (what we ask for), pixel corners (any value beyond 1000), or an {x,y,w,h} object. Returns percent for corners. */
export function toBox(v: unknown, size: { width: number; height: number }): z.infer<typeof Box> | null {
  if (Array.isArray(v)) {
    if (v.length !== 4 || !v.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    const [x1, y1, x2, y2] = v as number[];
    if (x2 <= x1 || y2 <= y1) return null;
    const pixels = v.some((n) => n > 1000);
    const sx = pixels ? 100 / size.width : 0.1;
    const sy = pixels ? 100 / size.height : 0.1;
    const r = (n: number) => Math.round(n * 1e6) / 1e6;
    return { x: r(x1 * sx), y: r(y1 * sy), w: r((x2 - x1) * sx), h: r((y2 - y1) * sy) };
  }
  const r = Box.safeParse(v);
  return r.success ? r.data : null;
}
export type Reading = z.infer<typeof Reading>;

export const TilesFile = z.object({
  width: z.number(), height: z.number(),
  tiles: z.array(z.object({ id: z.string(), title: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
});
