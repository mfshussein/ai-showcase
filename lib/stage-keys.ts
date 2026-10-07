export type StageKeyAction = "next" | "back" | "evidence" | "live" | "escape";

export interface StageKeyEvent { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; repeat: boolean; targetTag: string }

const FOCUSABLE = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"]);

/** Decides what a key press on the stage should do, ignoring shortcuts with modifiers, key repeats, and keys aimed at a focused control. */
export function stageKeyAction(e: StageKeyEvent): StageKeyAction | null {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return null;
  if (e.key === "Escape") return "escape";
  if (FOCUSABLE.has(e.targetTag)) return null;
  switch (e.key) {
    case " ": case "ArrowRight": case "Enter": return "next";
    case "ArrowLeft": return "back";
    case "e": case "E": return "evidence";
    case "l": case "L": return "live";
    default: return null;
  }
}
