import { diffWords } from "diff";
import type { ReactNode } from "react";
import { Card } from "./card";
import { diffMode } from "./diff-mode";

function marked(text: string, needle: string | undefined, tone: "block" | "ok"): ReactNode {
  if (!needle || !text.includes(needle)) return text;
  const [before, ...rest] = text.split(needle);
  const cls = tone === "block" ? "bg-block/15 text-block" : "bg-ok/15 text-ok";
  return <>{before}<mark className={`rounded-sm px-0.5 font-medium ${cls}`}>{needle}</mark>{rest.join(needle)}</>;
}

/** Side by side. When the texts share most words, a word diff; when a clause was rewritten, the quoted phrases are marked instead. */
export function DiffPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const left = typeof props.left === "string" ? props.left : "";
  const right = typeof props.right === "string" ? props.right : "";
  const mode = diffMode(left, right);
  const parts = mode === "words" ? diffWords(left, right) : [];
  const col = (side: "left" | "right") => {
    if (mode === "highlight") {
      const needle = typeof props[`${side}Highlight`] === "string" ? (props[`${side}Highlight`] as string) : undefined;
      return marked(side === "left" ? left : right, needle, side === "left" ? "block" : "ok");
    }
    return parts.map((p, i) => {
      if (side === "left" && p.added) return null;
      if (side === "right" && p.removed) return null;
      const cls = p.removed ? "bg-block/15 text-block line-through decoration-block/60" : p.added ? "bg-ok/15 text-ok font-medium" : "";
      return <span key={i} className={cls}>{p.value}</span>;
    });
  };
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
