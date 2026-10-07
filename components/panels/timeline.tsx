import { Card } from "./card";

type Night = { date: string; state: "quiet" | "alert" | "running" | "pending"; count?: number };

const style: Record<Night["state"], string> = {
  quiet: "border-ok/40 bg-ok/8 text-ok",
  alert: "border-block bg-block/10 text-block",
  running: "border-info bg-info/10 text-info animate-pulse",
  pending: "border-dashed border-line text-muted",
};
const word: Record<Night["state"], string> = { quiet: "quiet", alert: "alert", running: "running", pending: "tonight" };

/** One tile per night: what the watchman found. */
export function TimelinePanel({ props }: { id: string; props: Record<string, unknown> }) {
  const nights = Array.isArray(props.nights) ? (props.nights as Night[]) : [];
  return (
    <Card title={typeof props.title === "string" ? props.title : undefined}>
      <ol className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(nights.length, 1)}, minmax(0, 1fr))` }}>
        {nights.map((n) => (
          <li key={n.date} className={`rounded-sm border px-1.5 py-2 text-center ${style[n.state] ?? style.quiet}`}>
            <p className="font-mono text-[12px] text-muted">{n.date.slice(5)}</p>
            <p className="mt-1 font-mono text-xl font-medium leading-none">{n.state === "alert" ? n.count ?? "!" : n.state === "quiet" ? "0" : "…"}</p>
            <p className="mt-1 text-[11px]">{word[n.state] ?? n.state}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
