import type { PanelState } from "@/lib/run-state";
import { PANELS } from "@/components/panels";

export function PanelHost({ panels }: { panels: PanelState[] }) {
  const sorted = [...panels].sort((a, b) => a.order - b.order);
  const verdicts = sorted.filter((p) => p.kind === "verdict");
  const left = sorted.filter((p) => p.kind !== "verdict" && p.slot === "left");
  const right = sorted.filter((p) => p.kind !== "verdict" && p.slot === "right");
  const main = sorted.filter((p) => p.kind !== "verdict" && p.slot === "main");
  const aside = sorted.filter((p) => p.kind !== "verdict" && p.slot === "aside");
  const render = (p: PanelState) => { const C = PANELS[p.kind]; return <C key={p.id} id={p.id} props={p.props} />; };
  return (
    <div className="space-y-4">
      {verdicts.map(render)}
      {(left.length > 0 || right.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">{left.map(render)}</div>
          <div className="space-y-4">{right.map(render)}</div>
        </div>
      )}
      {aside.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">{main.map(render)}</div>
          <div className="space-y-4">{aside.map(render)}</div>
        </div>
      ) : main.map(render)}
    </div>
  );
}
