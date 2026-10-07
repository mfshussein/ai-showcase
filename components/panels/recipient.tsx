"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Card } from "./card";
import { stageExtras } from "@/lib/stage-extras";

/** Who receives tonight's report. Prefilled with the owner's address, shown masked; anyone in the room can type their own. */
export function RecipientPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const value = useSyncExternalStore(stageExtras.subscribe, stageExtras.getRecipient, () => "");
  const [info, setInfo] = useState<{ defaultMasked: string; canSend: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/alert").then((r) => r.json()).then((j) => { if (live) setInfo(j); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return (
    <Card>
      <label className="flex flex-wrap items-center gap-4">
        <span className="text-lg font-semibold">{typeof props.label === "string" ? props.label : "Email to"}</span>
        <input
          type="email" inputMode="email" autoComplete="off" spellCheck={false}
          value={value} onChange={(e) => stageExtras.setRecipient(e.target.value)}
          placeholder={info?.defaultMasked || "*********.com"}
          className="min-w-[18rem] flex-1 rounded-md border border-line bg-bg px-4 py-2 font-mono text-lg placeholder:text-fg focus:border-accent focus:outline-none"
        />
        {info && !info.canSend && <span className="text-sm text-muted">Preview: the email is sent in presenter sessions.</span>}
      </label>
    </Card>
  );
}
