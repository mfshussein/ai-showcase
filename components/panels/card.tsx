import type { ReactNode } from "react";

export function Card({ title, children, className = "", titleRight }: { title?: string; children: ReactNode; className?: string; titleRight?: ReactNode }) {
  return (
    <section className={`rounded-md border border-line bg-card ${className}`}>
      {(title || titleRight) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h3 className="text-sm font-medium text-muted">{title}</h3>
          {titleRight}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
