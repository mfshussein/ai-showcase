import { RunEvent, type RunEventInput } from "./events";

/** Adds `t` (ms since the first event) and validates each event a runner yields. */
export async function* stamp(gen: AsyncGenerator<RunEventInput>, now: () => number = Date.now): AsyncGenerator<RunEvent> {
  let t0: number | null = null;
  for await (const e of gen) {
    const n = now();
    if (t0 === null) t0 = n;
    yield RunEvent.parse({ ...e, t: n - t0 });
  }
}
