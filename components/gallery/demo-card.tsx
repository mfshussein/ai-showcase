import Link from "next/link";
import type { DemoManifest } from "@/demos/types";

export function DemoCard({ demo, index }: { demo: DemoManifest; index: number }) {
  const ready = demo.status === "ready";
  const body = (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-sm text-muted">{String(index + 1).padStart(2, "0")}</span>
        {!ready && <span className="text-sm text-muted">Coming next</span>}
      </div>
      <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">{demo.title}</h2>
      <p className="mt-2 text-base leading-snug text-muted">{demo.hook}</p>
      <p className="mt-5 text-sm">
        <span className="font-medium">{demo.lesson.name}</span>
        <span className="text-muted">, {demo.lesson.year}</span>
      </p>
      <p className="mt-3 text-sm text-muted">
        {[...demo.tags.capability.slice(0, 2), ...demo.tags.vertical.slice(0, 1)].join("  /  ")}
      </p>
    </>
  );
  const cls = "flex h-full flex-col rounded-md border border-line bg-card p-6 text-fg";
  if (!ready) return <div className={`${cls} opacity-60`}>{body}</div>;
  return (
    <Link href={`/demo/${demo.slug}`} className={`${cls} hover:border-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40`}>
      {body}
    </Link>
  );
}
