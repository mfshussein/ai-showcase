import { Card } from "./card";
import { Chip, isTone } from "./tone";

type Field = { path: string; value: unknown; confidence?: number; tone?: unknown; note?: string };

export function JsonPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const errors = Array.isArray(props.errors) ? (props.errors as { path: string; message: string }[]) : [];
  const fields = Array.isArray(props.fields) ? (props.fields as Field[]) : null;
  return (
    <Card title={typeof props.title === "string" ? props.title : "Record"}>
      {fields ? (
        <table className="w-full text-left text-[15px]">
          <thead><tr className="text-sm text-muted"><th className="pb-2 pr-4 font-medium">Field</th><th className="pb-2 pr-4 font-medium">Value</th><th className="pb-2 font-medium">Confidence</th></tr></thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.path} className="border-t border-line align-top">
                <td className="py-2 pr-4 font-mono text-[13px] text-muted">{f.path}</td>
                <td className="py-2 pr-4" dir="auto">{f.value === null || f.value === undefined ? <span className="text-muted">unreadable</span> : String(f.value)}</td>
                <td className="py-2">
                  {typeof f.confidence === "number" ? <Chip text={`${Math.round(f.confidence * 100)}%${f.note ? " " + f.note : ""}`} tone={isTone(f.tone) ? f.tone : "info"} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <pre className="overflow-auto font-mono text-[14px] leading-relaxed">{JSON.stringify(props.value ?? null, null, 2)}</pre>
      )}
      {errors.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          {errors.map((e) => <li key={e.path} className="text-block"><span className="font-mono">{e.path}</span> {e.message}</li>)}
        </ul>
      )}
    </Card>
  );
}
