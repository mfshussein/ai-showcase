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
export const Reading = z.object({
  cfoLines: z.array(z.string()).length(3),
  anomalies: z.array(z.object({ label: z.string(), why: z.string(), box: Box })).length(2),
  questions: z.array(z.string()).length(3),
});
export type Reading = z.infer<typeof Reading>;

export const TilesFile = z.object({
  width: z.number(), height: z.number(),
  tiles: z.array(z.object({ id: z.string(), title: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })),
});
