"use client";
import { useEffect, useRef, useState } from "react";
import { MessageSquareText } from "lucide-react";
import type { Note } from "@/discovery/engine";
import type { Tag } from "@/discovery/types";
import { Panel, TAGS, TagChip } from "./bits";

const ORDER: Tag[] = ["pain", "symptom", "root-cause", "obstacle", "fact", "evidence", "quote"];

/** The transcript as findings rather than prose: each line is tagged and points back to the question it came from. */
export function SummaryPanel({ notes, className }: { notes: Note[]; className?: string }) {
  const [filter, setFilter] = useState<Tag | null>(null);
  const newest = notes.at(-1)?.id;
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => { topRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [newest]);
  const counts = Object.fromEntries(ORDER.map((t) => [t, notes.filter((n) => n.tag === t).length])) as Record<Tag, number>;
  const shown = [...notes].reverse().filter((n) => !filter || n.tag === filter);

  return (
    <Panel title="Transcript summary" icon={<MessageSquareText size={15} />} className={className}
      right={<span className="font-mono text-xs text-muted">{notes.length} findings</span>}>
      <div className="sticky top-0 z-10 flex flex-wrap gap-1.5 border-b border-line bg-card/95 px-4 py-2 backdrop-blur">
        {ORDER.filter((t) => counts[t] > 0).map((t) => (
          <button key={t} type="button" onClick={() => setFilter(filter === t ? null : t)} aria-pressed={filter === t}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition ${filter === t ? "border-fg bg-fg text-white" : "border-line text-muted hover:border-fg/40"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${filter === t ? "bg-white" : TAGS[t].dot}`} />{TAGS[t].label}<span className="font-mono">{counts[t]}</span>
          </button>
        ))}
        {notes.length === 0 && <span className="text-xs text-muted">Findings appear here as the client answers.</span>}
      </div>
      <div ref={topRef} />
      <ol className="divide-y divide-line">
        {shown.map((n) => (
          <li key={n.id} className={`flex gap-3 px-4 py-2.5 ${n.id === newest ? "note-enter bg-accent/[0.04]" : ""}`}>
            <span className="mt-0.5 w-7 shrink-0 font-mono text-[11px] text-muted">Q{n.q}</span>
            <div className="min-w-0 space-y-1">
              <TagChip tag={n.tag} />
              <p className={`text-[13.5px] leading-snug ${n.tag === "quote" ? "italic text-muted" : ""}`}>{n.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
