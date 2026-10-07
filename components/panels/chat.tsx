import ReactMarkdown from "react-markdown";
import { Card } from "./card";

type Msg = { role: "user" | "assistant" | "system"; text: string; note?: string };

function Bubble({ m }: { m: Msg }) {
  if (m.role === "system") return <p className="rounded-md border border-dashed border-line px-4 py-2 text-sm text-muted">{m.text}</p>;
  const user = m.role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-md px-4 py-3 text-[17px] leading-relaxed ${user ? "bg-fg text-white" : "border border-line bg-bg"}`}>
        {user ? m.text : <div className="prose-chat"><ReactMarkdown>{m.text}</ReactMarkdown></div>}
        {m.note && <p className="mt-2 text-sm opacity-70">{m.note}</p>}
      </div>
    </div>
  );
}

export function ChatPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const messages = Array.isArray(props.messages) ? (props.messages as Msg[]) : [];
  const text = typeof props.text === "string" ? props.text : "";
  return (
    <Card title={typeof props.title === "string" ? props.title : "Conversation"}>
      <div className="space-y-3">
        {messages.map((m, i) => <Bubble key={i} m={m} />)}
        {text && <Bubble m={{ role: "assistant", text }} />}
      </div>
    </Card>
  );
}
