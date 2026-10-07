import { Card } from "./card";
import { Chip, isTone } from "./tone";

type Col = { key: string; label: string };
type Cell = string | number | { text: string; tone?: unknown } | undefined;

export function TablePanel({ props }: { id: string; props: Record<string, unknown> }) {
  const columns = Array.isArray(props.columns) ? (props.columns as Col[]) : [];
  const rows = Array.isArray(props.rows) ? (props.rows as Record<string, Cell>[]) : [];
  return (
    <Card title={typeof props.title === "string" ? props.title : undefined} className="overflow-hidden">
      <table className="w-full text-left text-[15px]">
        <thead>
          <tr className="text-sm text-muted">
            {columns.map((c) => <th key={c.key} className="pb-2 pr-4 font-medium">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line align-top">
              {columns.map((c) => {
                const v = r[c.key];
                return (
                  <td key={c.key} className="py-2.5 pr-4" dir="auto">
                    {v && typeof v === "object" ? <Chip text={v.text} tone={isTone(v.tone) ? v.tone : "info"} /> : typeof v === "number" ? <span className="font-mono">{v}</span> : v ?? ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
