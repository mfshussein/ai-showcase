"use client";
import { useEffect, useState } from "react";

type Health = { apiKey: boolean; model: string; fastModel: string; goldens: { slug: string; loaded: boolean }[]; viewerPassword: boolean; cookieSecret: boolean; probe?: { ok: boolean; latencyMs: number; text?: string; error?: string } };

function Dot({ ok }: { ok: boolean }) { return <span className={`inline-block h-3 w-3 rounded-full ${ok ? "bg-ok" : "bg-block"}`} aria-label={ok ? "ok" : "problem"} />; }

export function HealthClient() {
  const [h, setH] = useState<Health | null>(null);
  const [probing, setProbing] = useState(false);
  useEffect(() => {
    let on = true;
    fetch("/api/health").then((r) => r.json()).then((d: Health) => { if (on) setH(d); });
    return () => { on = false; };
  }, []);
  const probe = async () => {
    setProbing(true);
    const res = await fetch("/api/health?probe=1");
    setH((await res.json()) as Health);
    setProbing(false);
  };
  if (!h) return <p className="text-muted">Checking…</p>;
  return (
    <div className="space-y-6">
      <ul className="space-y-2 text-[17px]">
        <li className="flex items-center gap-3"><Dot ok={h.apiKey} /> Anthropic API key {h.apiKey ? "present" : "missing (ANTHROPIC_API_KEY)"}</li>
        <li className="flex items-center gap-3"><Dot ok={h.viewerPassword} /> Viewer password set</li>
        <li className="flex items-center gap-3"><Dot ok={h.cookieSecret} /> Cookie secret set</li>
        <li className="flex items-center gap-3"><Dot ok /> Models <span className="font-mono text-sm">{h.model}</span> and <span className="font-mono text-sm">{h.fastModel}</span></li>
        {h.goldens.map((g) => <li key={g.slug} className="flex items-center gap-3"><Dot ok={g.loaded} /> Recorded run for <span className="font-mono text-sm">{g.slug}</span></li>)}
        {h.probe && (
          <li className="flex items-center gap-3"><Dot ok={h.probe.ok} /> Model probe {h.probe.ok ? `answered "${h.probe.text}" in ${h.probe.latencyMs} ms` : `failed: ${h.probe.error}`}</li>
        )}
      </ul>
      <button type="button" onClick={probe} disabled={probing} className="rounded-md bg-fg px-4 py-2 font-semibold text-white disabled:opacity-50">
        {probing ? "Probing…" : "Probe the model"}
      </button>
    </div>
  );
}
