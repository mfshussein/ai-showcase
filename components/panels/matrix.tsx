import { Card } from "./card";
import { Chip, isTone } from "./tone";

type Item = { label: string; x: 0 | 1; y: 0 | 1; tone?: unknown };

export function MatrixPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const xs = (props.xLabels as [string, string]) ?? ["", ""];
  const ys = (props.yLabels as [string, string]) ?? ["", ""];
  const items = Array.isArray(props.items) ? (props.items as Item[]) : [];
  return (
    <Card title={typeof props.title === "string" ? props.title : undefined}>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
        <div />
        {xs.map((x) => <p key={x} className="text-center text-sm text-muted">{x}</p>)}
        {[1, 0].map((y) => (
          <div key={y} className="contents">
            <p className="self-center pr-2 text-sm text-muted">{ys[y]}</p>
            {[0, 1].map((x) => (
              <div key={x} className="flex min-h-28 flex-wrap content-start gap-2 rounded-md border border-line bg-bg p-3">
                {items.filter((i) => i.x === x && i.y === y).map((i) => <Chip key={i.label} text={i.label} tone={isTone(i.tone) ? i.tone : "info"} />)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
