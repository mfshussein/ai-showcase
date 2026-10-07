"use client";
import { useEffect } from "react";
import type { PanelState } from "@/lib/run-state";
import { PANELS } from "@/components/panels";

/** Lays out panels by slot and keeps the newest change in view, so the presenter never has to scroll. */
export function PanelHost({ panels }: { panels: PanelState[] }) {
  const sorted = [...panels].sort((a, b) => a.order - b.order);
  const verdicts = sorted.filter((p) => p.kind === "verdict");
  const left = sorted.filter((p) => p.kind !== "verdict" && p.slot === "left");
  const right = sorted.filter((p) => p.kind !== "verdict" && p.slot === "right");
  const main = sorted.filter((p) => p.kind !== "verdict" && p.slot === "main");
  const aside = sorted.filter((p) => p.kind !== "verdict" && p.slot === "aside");
  const newest = sorted.reduce<PanelState | null>((a, p) => (!a || p.order > a.order ? p : a), null);
  const newestId = newest?.id;
  const newestOrder = newest?.order;
  const newestKind = newest?.kind;

  useEffect(() => {
    if (!newestId) return;
    if (newestKind === "verdict") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    document.querySelector(`[data-panel-id="${CSS.escape(newestId)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [newestId, newestOrder, newestKind]);

  const render = (p: PanelState) => {
    const C = PANELS[p.kind];
    // A verdict remounts when its content changes so the settle animation plays for every verdict, not only the first.
    const key = p.kind === "verdict" ? `${p.id}:${String(p.props.status)}:${String(p.props.headline)}` : p.id;
    return (
      <div key={key} data-panel-id={p.id}>
        <C id={p.id} props={p.props} />
      </div>
    );
  };
  return (
    <div className="space-y-4">
      {verdicts.map(render)}
      {left.length > 0 && right.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">{left.map(render)}</div>
          <div className="space-y-4">{right.map(render)}</div>
        </div>
      ) : (
        [...left, ...right].map(render)
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
