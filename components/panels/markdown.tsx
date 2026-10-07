import ReactMarkdown from "react-markdown";
import { isTone, toneBorder } from "./tone";

export function MarkdownPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const text = typeof props.text === "string" ? props.text : "";
  const title = typeof props.title === "string" ? props.title : undefined;
  const tone = isTone(props.tone) ? props.tone : undefined;
  const display = props.size === "display";
  return (
    <section className={`rounded-md border border-line bg-card ${display ? "p-10 md:p-14" : "p-6"} ${tone ? `border-l-4 ${toneBorder[tone]}` : ""}`}>
      {title && <h3 className={`font-semibold tracking-tight ${display ? "max-w-4xl text-4xl leading-[1.15] md:text-5xl" : "text-2xl leading-snug"}`}>{title}</h3>}
      <div className={`prose-stage ${display ? "mt-6 max-w-3xl text-xl" : ""} ${title && !display ? "mt-3" : ""}`}>
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </section>
  );
}
