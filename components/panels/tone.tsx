import type { Tone } from "@/lib/events";

export const toneText: Record<Tone, string> = { ok: "text-ok", warn: "text-warn", block: "text-block", quarantine: "text-quarantine", info: "text-info" };
export const toneBorder: Record<Tone, string> = { ok: "border-ok", warn: "border-warn", block: "border-block", quarantine: "border-quarantine", info: "border-info" };
export const toneBg: Record<Tone, string> = { ok: "bg-ok", warn: "bg-warn", block: "bg-block", quarantine: "bg-quarantine", info: "bg-info" };
export const toneSoft: Record<Tone, string> = { ok: "bg-ok/8", warn: "bg-warn/8", block: "bg-block/8", quarantine: "bg-quarantine/8", info: "bg-info/8" };

export function isTone(v: unknown): v is Tone {
  return v === "ok" || v === "warn" || v === "block" || v === "quarantine" || v === "info";
}

export function Chip({ text, tone }: { text: string; tone?: Tone }) {
  const t = tone ?? "info";
  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[13px] font-medium ${toneText[t]} ${toneBorder[t]} ${toneSoft[t]}`}>
      {text}
    </span>
  );
}
