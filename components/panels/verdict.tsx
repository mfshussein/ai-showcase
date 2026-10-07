import type { Evidence } from "@/lib/events";
import { isTone, toneBorder, toneText } from "./tone";

export function VerdictPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const tone = isTone(props.tone) ? props.tone : "info";
  const evidence = Array.isArray(props.evidence) ? (props.evidence as Evidence[]) : [];
  return (
    <section data-verdict className={`verdict-enter rounded-md border-2 bg-card ${toneBorder[tone]}`}>
      <div className="grid gap-6 p-7 md:grid-cols-[auto_1fr] md:gap-10">
        <p className={`font-mono text-5xl font-medium leading-none tracking-tight md:text-6xl ${toneText[tone]}`}>{String(props.status ?? "")}</p>
        <div>
          <p className="text-2xl font-semibold leading-snug tracking-tight">{String(props.headline ?? "")}</p>
          <p className="mt-2 text-lg leading-relaxed text-muted">{String(props.reason ?? "")}</p>
          {evidence.length > 0 && (
            <dl className="mt-5 grid gap-x-8 gap-y-2 border-t border-line pt-4 text-[15px] sm:grid-cols-2">
              {evidence.map((e) => (
                <div key={e.label} className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted">{e.label}</dt>
                  <dd className="min-w-0">{e.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
