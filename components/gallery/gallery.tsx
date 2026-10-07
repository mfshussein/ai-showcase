"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { DemoManifest } from "@/demos/types";
import { Brand } from "@/components/brand";
import { TagFilter } from "./tag-filter";
import { DemoCard } from "./demo-card";

type Axis = "capability" | "useCase" | "vertical";
const AXES: { key: Axis; label: string }[] = [
  { key: "capability", label: "Capability" },
  { key: "useCase", label: "Use case" },
  { key: "vertical", label: "Sector" },
];

export function Gallery({ demos, presenter, walkthroughHref }: { demos: DemoManifest[]; presenter: boolean; walkthroughHref?: string }) {
  const [sel, setSel] = useState<Record<Axis, string[]>>({ capability: [], useCase: [], vertical: [] });
  const options = useMemo(() => {
    const out = { capability: new Set<string>(), useCase: new Set<string>(), vertical: new Set<string>() };
    for (const d of demos) for (const a of AXES) for (const t of d.tags[a.key]) out[a.key].add(t);
    return { capability: [...out.capability].sort(), useCase: [...out.useCase].sort(), vertical: [...out.vertical].sort() };
  }, [demos]);
  const visible = demos.filter((d) => AXES.every((a) => sel[a.key].length === 0 || d.tags[a.key].some((t) => sel[a.key].includes(t))));
  const toggle = (axis: Axis, v: string) => setSel((s) => ({ ...s, [axis]: s[axis].includes(v) ? s[axis].filter((x) => x !== v) : [...s[axis], v] }));

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10">
      <header className="flex items-center justify-between">
        <Brand />
        <div className="flex items-center gap-4 text-sm text-muted">
          {presenter && <Link href="/health" className="hover:text-fg">Preflight</Link>}
          <span>{presenter ? "Presenter" : "Viewer"}</span>
        </div>
      </header>

      <section className="mt-16 max-w-3xl">
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
          AI rarely fails because the model is weak. It fails on data, governance and compliance.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Each case below is a short, pre-loaded demonstration. Watch the AI get it wrong, then watch a control catch it. Every control is code, and every decision is logged.
        </p>
        {walkthroughHref && (
          <Link href={walkthroughHref} className="mt-8 inline-flex rounded-md bg-accent px-5 py-3 text-base font-semibold text-white hover:bg-[#1239b0] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
            Start the walkthrough
          </Link>
        )}
      </section>

      <section className="mt-16 space-y-3 border-t border-line pt-6">
        {AXES.map((a) => (
          <TagFilter key={a.key} label={a.label} options={options[a.key]} selected={sel[a.key]}
            onToggle={(v) => toggle(a.key, v)} onClear={() => setSel((s) => ({ ...s, [a.key]: [] }))} />
        ))}
      </section>

      {demos.length === 0 ? (
        <p className="mt-10 text-base text-muted">No cases recorded yet. Run <code className="font-mono">npm run record &lt;slug&gt;</code> to add the first one.</p>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-base text-muted">No case matches those filters. Clear one to see more.</p>
      ) : (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((d) => <DemoCard key={d.slug} demo={d} index={demos.indexOf(d)} />)}
        </section>
      )}
    </main>
  );
}
