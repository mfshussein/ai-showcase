"use client";
import { useEffect, useRef } from "react";
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
  const refs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    if (!newest) return;
    if (newest.kind === "verdict") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    refs.current.get(newest.id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [newest?.id, newest?.order, newest?.kind, newest]);

  const render = (p: PanelState) => {
    const C = PANELS[p.kind];
    return (
      <div key={p.id} ref={(el) => { if (el) refs.current.set(p.id, el); else refs.current.delete(p.id); }}>
        <C id={p.id} props={p.props} />
      </div>
    );
  };
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
