import { X } from "lucide-react";
import type { RunState } from "@/lib/run-state";

export function EvidenceDrawer({ open, onClose, state, model, mode }: { open: boolean; onClose: () => void; state: RunState; model: string; mode: string }) {
  return (
    <aside aria-hidden={!open} className={`fixed inset-y-0 right-0 z-20 w-full max-w-md transform border-l border-line bg-card transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}>
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-lg font-semibold">Evidence</h2>
        <button type="button" onClick={onClose} aria-label="Close evidence" className="rounded-md p-1 hover:bg-bg"><X className="h-5 w-5" /></button>
      </header>
      <div className="space-y-6 overflow-auto p-5 text-[15px]">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted">Mode</dt><dd className="font-mono">{mode}</dd>
          <dt className="text-muted">Model</dt><dd className="font-mono">{model}</dd>
          {state.usage && (<><dt className="text-muted">Cost</dt><dd className="font-mono">${state.usage.costUsd.toFixed(3)} ({state.usage.inputTokens + state.usage.outputTokens} tokens)</dd></>)}
        </dl>
        <section>
          <h3 className="mb-2 text-sm font-medium text-muted">Audit record</h3>
          {state.controls.length === 0 ? (
            <p className="text-muted">No control has fired yet.</p>
          ) : (
            <ol className="space-y-3">
              {state.controls.map((c) => (
                <li key={c.recordId} className="rounded-md border border-line p-3">
                  <p className="font-mono text-sm">{c.recordId} <span className="text-muted">{c.policyId}</span></p>
                  <p className="mt-1"><span className="font-medium">{c.action}</span> by {c.detector}{typeof c.score === "number" ? ` (score ${c.score})` : ""}</p>
                  {c.detail && <p className="mt-1 text-sm text-muted">{c.detail}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </aside>
  );
}
