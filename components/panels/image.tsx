/* eslint-disable @next/next/no-img-element */
import { Card } from "./card";

type Callout = { x: number; y: number; w: number; h: number; label: string };

export function ImagePanel({ props }: { id: string; props: Record<string, unknown> }) {
  const callouts = Array.isArray(props.callouts) ? (props.callouts as Callout[]) : [];
  return (
    <Card title={typeof props.title === "string" ? props.title : undefined}>
      <div className="relative inline-block max-w-full">
        <img src={String(props.src ?? "")} alt={String(props.alt ?? "")} className="max-h-[60vh] w-auto rounded-sm" />
        {callouts.map((c, i) => (
          <div key={i} className="absolute rounded-sm border-2 border-block" style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%` }}>
            <span className="absolute -top-7 left-0 whitespace-nowrap rounded-sm bg-block px-2 py-0.5 text-sm text-white">{c.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
