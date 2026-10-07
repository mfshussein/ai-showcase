import type { Tone } from "./events";

export type Segment = { text: string; tone?: Tone };

/** Splits text into plain and highlighted segments. Matching is case-insensitive; where phrases overlap, the earlier phrase in the list wins. */
export function splitHighlights(text: string, phrases: { text: string; tone: Tone }[]): Segment[] {
  const lower = text.toLowerCase();
  const marks: { start: number; end: number; tone: Tone }[] = [];
  for (const p of phrases) {
    const needle = p.text.toLowerCase();
    if (!needle) continue;
    for (let i = lower.indexOf(needle); i !== -1; i = lower.indexOf(needle, i + needle.length)) {
      const end = i + needle.length;
      if (!marks.some((m) => i < m.end && end > m.start)) marks.push({ start: i, end, tone: p.tone });
    }
  }
  marks.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const m of marks) {
    if (m.start > pos) out.push({ text: text.slice(pos, m.start) });
    out.push({ text: text.slice(m.start, m.end), tone: m.tone });
    pos = m.end;
  }
  if (pos < text.length || out.length === 0) out.push({ text: text.slice(pos) });
  return out;
}
