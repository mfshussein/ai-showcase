import { FileText } from "lucide-react";
import { Card } from "./card";
import { Chip, isTone } from "./tone";

type FileRow = { name: string; size?: string; status?: string; tone?: unknown; meta?: string };

export function FilesPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const files = Array.isArray(props.files) ? (props.files as FileRow[]) : [];
  const title = typeof props.title === "string" ? props.title : "Files";
  return (
    <Card title={title}>
      <ul className="divide-y divide-line">
        {files.map((f) => (
          <li key={f.name} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            <FileText className="h-5 w-5 shrink-0 text-muted" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[15px]">{f.name}</p>
              {f.meta && <p className="text-sm text-muted">{f.meta}</p>}
            </div>
            {f.size && <span className="text-sm text-muted">{f.size}</span>}
            {f.status && <Chip text={f.status} tone={isTone(f.tone) ? f.tone : "info"} />}
          </li>
        ))}
      </ul>
    </Card>
  );
}
