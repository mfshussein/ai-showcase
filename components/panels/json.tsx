import { Card } from "./card";

export function JsonPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const errors = Array.isArray(props.errors) ? (props.errors as { path: string; message: string }[]) : [];
  return (
    <Card title={typeof props.title === "string" ? props.title : "Record"}>
      <pre className="overflow-auto font-mono text-[14px] leading-relaxed">{JSON.stringify(props.value ?? null, null, 2)}</pre>
      {errors.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
          {errors.map((e) => <li key={e.path} className="text-block"><span className="font-mono">{e.path}</span> {e.message}</li>)}
        </ul>
      )}
    </Card>
  );
}
