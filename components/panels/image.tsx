/* eslint-disable @next/next/no-img-element */
import { Card } from "./card";

type Callout = { x: number; y: number; w: number; h: number; label: string };
type GridImage = { src: string; alt: string; caption?: string; selected?: boolean };

export function ImagePanel({ props }: { id: string; props: Record<string, unknown> }) {
  const title = typeof props.title === "string" ? props.title : undefined;
  if (Array.isArray(props.images)) {
    const images = props.images as GridImage[];
    return (
      <Card title={title}>
        <div className={`grid gap-4 ${images.length > 2 ? "grid-cols-2" : images.length === 2 ? "grid-cols-2" : ""}`}>
          {images.map((im) => (
            <figure key={im.src} className={`rounded-sm border-2 p-1 ${im.selected ? "border-accent" : "border-transparent"}`}>
              <img src={im.src} alt={im.alt} className="max-h-[30vh] w-full rounded-sm object-contain" />
              {im.caption && <figcaption className="mt-1 text-sm text-muted" dir="auto">{im.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </Card>
    );
  }
  const callouts = Array.isArray(props.callouts) ? (props.callouts as Callout[]) : [];
  return (
    <Card title={title}>
      <div className="relative inline-block max-w-full">
        <img src={String(props.src ?? "")} alt={String(props.alt ?? "")} className="max-h-[60vh] w-auto rounded-sm" />
        {callouts.map((c, i) => (
          <div key={i} className="callout-enter absolute rounded-sm border-[3px] border-block" style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%` }}>
            <span className="absolute -top-7 left-0 z-10 whitespace-nowrap rounded-sm bg-block px-2 py-0.5 text-sm text-white">{c.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
