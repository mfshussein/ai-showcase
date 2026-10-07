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

/** Accepts {x,y,w,h} or [x,y,w,h]; anything else is no box. */
export function toBox(v: unknown): z.infer<typeof Box> | null {
  if (Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === "number")) return { x: v[0], y: v[1], w: v[2], h: v[3] };
  const r = Box.safeParse(v);
  return r.success ? r.data : null;
}
export type Reading = z.infer<typeof Reading>;

export const TilesFile = z.object({
  width: z.number(), height: z.number(),
  tiles: z.array(z.object({ id: z.string(), title: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
});
