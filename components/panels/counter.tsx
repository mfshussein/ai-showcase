import { Card } from "./card";
import { isTone, toneText, toneSoft } from "./tone";
import { splitHighlights } from "@/lib/highlight";
import type { Tone } from "@/lib/events";

/** A large n/m score with the text it was scored on, matched phrases highlighted and misses listed. */
export function CounterPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const tone = isTone(props.tone) ? props.tone : "info";
  const highlights = Array.isArray(props.highlights) ? (props.highlights as { text: string; tone: Tone }[]) : [];
  const missed = Array.isArray(props.missed) ? (props.missed as string[]) : [];
  const text = typeof props.text === "string" ? props.text : "";
  return (
    <Card title={typeof props.title === "string" ? props.title : undefined}>
      <div className="grid gap-6 md:grid-cols-[auto_1fr] md:gap-10">
        <div>
          <p className={`font-mono text-7xl font-medium leading-none tracking-tight ${toneText[tone]}`}>
            {String(props.value ?? 0)}<span className="text-muted">/{String(props.total ?? 0)}</span>
          </p>
          {typeof props.label === "string" && <p className="mt-2 text-sm text-muted">{props.label}</p>}
        </div>
        <div className="min-w-0">
          {text && (
            <p className="text-lg leading-relaxed" dir="auto">
              {splitHighlights(text, highlights).map((s, i) =>
                s.tone ? <mark key={i} className={`rounded-sm px-0.5 ${toneSoft[s.tone]} ${toneText[s.tone]} font-medium`}>{s.text}</mark> : <span key={i}>{s.text}</span>,
              )}
            </p>
          )}
          {missed.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-sm text-muted">House terms missing</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {missed.map((m) => <li key={m} className="rounded-sm border border-block bg-block/8 px-2 py-0.5 text-[15px] text-block">{m}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
