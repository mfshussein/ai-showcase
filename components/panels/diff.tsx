import { diffWords } from "diff";
import { Card } from "./card";

export function DiffPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const left = typeof props.left === "string" ? props.left : "";
  const right = typeof props.right === "string" ? props.right : "";
  const parts = diffWords(left, right);
  const col = (side: "left" | "right") => parts.map((p, i) => {
    if (side === "left" && p.added) return null;
    if (side === "right" && p.removed) return null;
    const cls = p.removed ? "bg-block/15 text-block line-through decoration-block/60" : p.added ? "bg-ok/15 text-ok font-medium" : "";
    return <span key={i} className={cls}>{p.value}</span>;
  });
  return (
    <Card title={typeof props.title === "string" ? props.title : "What changed"}>
      <div className="grid gap-6 md:grid-cols-2">
        {(["left", "right"] as const).map((side) => (
          <div key={side}>
            <p className="mb-2 font-mono text-sm text-muted">{String(props[`${side}Title`] ?? side)}</p>
            <p className="text-lg leading-relaxed">{col(side)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
