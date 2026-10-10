import { useEffect, useState, type ReactNode } from "react";
import type { Tag } from "@/discovery/types";

export const TAGS: Record<Tag, { label: string; cls: string; dot: string }> = {
  symptom: { label: "Symptom", cls: "border-warn/30 bg-warn/10 text-warn", dot: "bg-warn" },
  pain: { label: "Pain", cls: "border-block/30 bg-block/10 text-block", dot: "bg-block" },
  "root-cause": { label: "Root cause", cls: "border-quarantine/30 bg-quarantine/10 text-quarantine", dot: "bg-quarantine" },
  obstacle: { label: "Obstacle", cls: "border-fg/25 bg-fg/[0.06] text-fg", dot: "bg-fg" },
  fact: { label: "Fact", cls: "border-info/30 bg-info/10 text-info", dot: "bg-info" },
  quote: { label: "Quote", cls: "border-line bg-bg text-muted", dot: "bg-muted" },
  evidence: { label: "Evidence", cls: "border-ok/30 bg-ok/10 text-ok", dot: "bg-ok" },
};

export function TagChip({ tag }: { tag: Tag }) {
  return <span className={`inline-flex shrink-0 items-center rounded-sm border px-1.5 py-px text-[11px] font-medium uppercase tracking-wide ${TAGS[tag].cls}`}>{TAGS[tag].label}</span>;
}

export function Panel({ title, icon, right, children, className = "", bodyClass = "" }: {
  title: string; icon?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <section className={`flex min-h-0 flex-col rounded-lg border border-line bg-card shadow-[0_1px_2px_rgba(15,23,32,0.04)] ${className}`}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-muted">{icon}{title}</h2>
        {right}
      </header>
      <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClass}`}>{children}</div>
    </section>
  );
}

/** True once `ms` has passed since mount; the engine "thinks" before a new question appears. */
export function useDelayed(ms: number, enabled = true) {
  const [ready, setReady] = useState(!enabled);
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => setReady(true), ms);
    return () => clearTimeout(t);
  }, [ms, enabled]);
  return ready;
}

export function money(currency: string, n: number) {
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
}

/** A synthetic screenshot of the client's shadow tracker, drawn in HTML so the demo needs no image asset. */
export function TrackerShot() {
  const rows: [string, string, string, string, number][] = [
    ["INV-40211", "Al-Majd Packaging", "48,200", "Logistics", 23],
    ["INV-40198", "Gulf Cold Chain", "112,950", "Warehousing", 19],
    ["INV-40233", "Najd Fuel Services", "31,400", "Fleet", 14],
    ["INV-40240", "Tihama Print House", "6,780", "Marketing", 12],
    ["INV-40261", "Eastern Pallets", "22,315", "Warehousing", 8],
    ["INV-40277", "Riyadh IT Supplies", "14,060", "IT", 5],
    ["INV-40285", "Hijaz Facilities", "9,900", "Admin", 3],
  ];
  return (
    <div className="w-full overflow-hidden rounded-md border border-line bg-white text-[11px] leading-tight shadow-sm" aria-label="Screenshot of the AP approvals tracker">
      <div className="flex items-center gap-2 bg-[#1d6f42] px-2.5 py-1.5 text-white">
        <span className="font-semibold">AP approvals tracker.xlsx</span>
        <span className="ml-auto opacity-80">Awaiting approval: 214</span>
      </div>
      <table className="w-full border-collapse font-mono">
        <thead>
          <tr className="bg-[#f3f3f3] text-left text-[#555]">
            {["Invoice", "Supplier", "SAR", "Budget holder", "Days waiting"].map((h) => <th key={h} className="border border-[#e1e1e1] px-1.5 py-1 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([inv, sup, amt, bh, days]) => (
            <tr key={inv} className={days > 10 ? "bg-[#fde8e8]" : ""}>
              <td className="border border-[#e1e1e1] px-1.5 py-0.5">{inv}</td>
              <td className="border border-[#e1e1e1] px-1.5 py-0.5 font-sans">{sup}</td>
              <td className="border border-[#e1e1e1] px-1.5 py-0.5 text-right">{amt}</td>
              <td className="border border-[#e1e1e1] px-1.5 py-0.5 font-sans">{bh}</td>
              <td className={`border border-[#e1e1e1] px-1.5 py-0.5 text-right ${days > 10 ? "font-semibold text-[#b91c1c]" : ""}`}>{days}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
