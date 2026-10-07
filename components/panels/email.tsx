import { Card } from "./card";

/** Inbox preview: exactly what the alert email said. The body is plain text, never injected HTML. */
export function EmailPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const rows: [string, unknown][] = [["From", props.from], ["To", props.to], ["Subject", props.subject]];
  return (
    <Card title={typeof props.title === "string" ? props.title : "Inbox"} titleRight={typeof props.sentAt === "string" ? <span className="font-mono text-sm text-muted">{props.sentAt}</span> : undefined}>
      <dl className="space-y-1 border-b border-line pb-3 text-[15px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3">
            <dt className="w-16 shrink-0 text-muted">{k}</dt>
            <dd className={k === "Subject" ? "font-semibold" : ""}>{String(v ?? "")}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 text-[15px] leading-relaxed">
        {/* One element per line so each Arabic or English line takes its own direction. */}
        {String(props.text ?? "").split("\n").map((line, i) => (line.trim() ? <p key={i} dir="auto" className="whitespace-pre-wrap">{line}</p> : <div key={i} className="h-3" />))}
      </div>
    </Card>
  );
}
