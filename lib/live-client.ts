import { RunEvent } from "./events";

/** Parses complete SSE frames out of a buffer; returns the unparsed remainder. Throws on an `event: error` frame. */
export function parseSseChunk(buf: string): { events: RunEvent[]; rest: string } {
  const frames = buf.split("\n\n");
  const rest = frames.pop() ?? "";
  const events: RunEvent[] = [];
  for (const f of frames) {
    const lines = f.split("\n");
    const data = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
    if (!data) continue;
    if (lines.some((l) => l.startsWith("event: error"))) {
      const msg = (JSON.parse(data) as { message?: string }).message ?? "live run failed";
      throw new Error(msg);
    }
    events.push(RunEvent.parse(JSON.parse(data)));
  }
  return { events, rest };
}

export async function* liveRun(slug: string, signal: AbortSignal): AsyncGenerator<RunEvent> {
  const res = await fetch(`/api/run/${slug}`, { signal });
  if (!res.ok || !res.body) throw new Error(`live run failed: ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const { events, rest } = parseSseChunk(buf);
    buf = rest;
    for (const e of events) yield e;
  }
}

/** Index in the golden run to resume from after a live failure: the start of the act that was in progress. */
export function fallbackCursor(golden: RunEvent[], live: RunEvent[]): number {
  const last = [...live].reverse().find((e) => e.type === "act.start");
  if (!last || last.type !== "act.start") return 0;
  const i = golden.findIndex((e) => e.type === "act.start" && e.act === last.act);
  return i === -1 ? 0 : i;
}

/** Re-yields events from `source`, failing if none arrives within `ms`. Protects the room from a hung model call. */
export async function* withInactivityTimeout<T>(source: AsyncGenerator<T>, ms: number): AsyncGenerator<T> {
  for (;;) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`no event for ${ms} ms`)), ms); });
    try {
      const r = await Promise.race([source.next(), timeout]);
      if (r.done) return;
      yield r.value;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
