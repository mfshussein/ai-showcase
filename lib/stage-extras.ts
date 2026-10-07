/** Client-side state that lives beside a run rather than in it: the recipient typed in the room, one-time sends, and evidence records added by the stage. */
import type { ControlEvent } from "./run-state";

type NewControl = Omit<ControlEvent, "type" | "t" | "recordId">;

export function createStageExtras() {
  let recipient = "";
  let controls: ControlEvent[] = [];
  let claimed = new Set<string>();
  let n = 0;
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((f) => f());
  return {
    subscribe(f: () => void) { subs.add(f); return () => { subs.delete(f); }; },
    getRecipient: () => recipient,
    setRecipient(v: string) { recipient = v; emit(); },
    /** True the first time a key is claimed: the caller may send. */
    claimSend(key: string) { if (claimed.has(key)) return false; claimed.add(key); return true; },
    getControls: () => controls,
    addControl(c: NewControl) { controls = [...controls, { type: "control.event", t: 0, ...c, recordId: `CE-STAGE-${++n}` }]; emit(); },
    reset() { controls = []; claimed = new Set(); emit(); },
  };
}

/** One per browser tab. */
export const stageExtras = createStageExtras();
