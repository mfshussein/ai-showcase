export function ActStrip({ acts, current }: { acts: { act: number; title: string }[]; current: number }) {
  return (
    <ol className="flex w-full gap-1" aria-label="Acts">
      {acts.map((a) => {
        const state = a.act === current ? "current" : a.act < current ? "done" : "todo";
        return (
          <li key={a.act} className="flex-1">
            <div className={`h-1 rounded-full ${state === "current" ? "bg-fg" : state === "done" ? "bg-fg/40" : "bg-line"}`} />
            <p className={`mt-1.5 truncate text-sm ${state === "current" ? "font-medium text-fg" : "text-muted"}`}>
              <span className="font-mono">{a.act}</span> {a.title}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
