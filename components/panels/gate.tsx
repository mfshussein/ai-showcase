import { Card } from "./card";

type Stage = { id: string; label: string; state: "idle" | "pass" | "fire" | "hold" | "skip"; note?: string };
const cls: Record<Stage["state"], string> = {
  idle: "border-line text-muted",
  pass: "border-ok text-ok",
  fire: "border-block bg-block text-white",
  hold: "border-warn bg-warn/10 text-warn",
  skip: "border-line text-muted opacity-50",
};

export function GatePanel({ props }: { id: string; props: Record<string, unknown> }) {
  const stages = Array.isArray(props.stages) ? (props.stages as Stage[]) : [];
  return (
    <Card title={typeof props.title === "string" ? props.title : "Request path"}>
      <ol className="flex items-stretch gap-3">
        {stages.map((s, i) => (
          <li key={s.id} className="flex flex-1 items-center gap-3">
            <div className={`flex-1 rounded-md border-2 px-4 py-4 text-center transition-colors duration-300 ${cls[s.state]}`}>
              <p className="text-lg font-semibold">{s.label}</p>
              {s.note && <p className="mt-1 text-sm opacity-80">{s.note}</p>}
            </div>
            {i < stages.length - 1 && <span className="text-muted" aria-hidden>›</span>}
          </li>
        ))}
      </ol>
    </Card>
  );
}
