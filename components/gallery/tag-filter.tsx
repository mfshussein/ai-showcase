"use client";

export function TagFilter({ label, options, selected, onToggle, onClear }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void; onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-24 shrink-0 text-sm text-muted">{label}</span>
      <button type="button" onClick={onClear}
        className={`rounded-full border px-3 py-1 text-sm ${selected.length === 0 ? "border-fg bg-fg text-white" : "border-line bg-card text-fg hover:border-fg"}`}>
        All
      </button>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => onToggle(o)} aria-pressed={on}
            className={`rounded-full border px-3 py-1 text-sm ${on ? "border-fg bg-fg text-white" : "border-line bg-card text-fg hover:border-fg"}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}
