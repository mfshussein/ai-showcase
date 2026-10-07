import { Card } from "./card";

type Criterion = { name: string; a?: number; b?: number; max: number; reasoning?: string };

export function ScorecardPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const criteria = Array.isArray(props.criteria) ? (props.criteria as Criterion[]) : [];
  const winner = typeof props.winner === "string" ? props.winner : undefined;
  return (
    <Card title={typeof props.title === "string" ? props.title : "Scorecard"} titleRight={winner && <span className="text-sm font-medium">{winner}</span>}>
      <table className="w-full text-[15px]">
        <thead><tr className="text-left text-sm text-muted"><th className="pb-2 font-medium">Criterion</th><th className="pb-2 font-medium">A</th><th className="pb-2 font-medium">B</th></tr></thead>
        <tbody>
          {criteria.map((c) => (
            <tr key={c.name} className="border-t border-line align-top">
              <td className="py-2 pr-4"><p>{c.name}</p>{c.reasoning && <p className="mt-1 text-sm text-muted">{c.reasoning}</p>}</td>
              <td className="py-2 pr-4 font-mono">{c.a ?? "–"}/{c.max}</td>
              <td className="py-2 font-mono">{c.b ?? "–"}/{c.max}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
