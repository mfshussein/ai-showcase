import ReactMarkdown from "react-markdown";
import type { ReactNode } from "react";

function highlight(children: ReactNode, needle: string): ReactNode {
  if (!needle) return children;
  const walk = (node: ReactNode): ReactNode => {
    if (typeof node === "string") {
      const parts = node.split(needle);
      if (parts.length === 1) return node;
      return parts.flatMap((p, i) => (i === 0 ? [p] : [<mark key={i} className="rounded-sm bg-warn/20 px-0.5">{needle}</mark>, p]));
    }
    if (Array.isArray(node)) return node.map((n, i) => <span key={i}>{walk(n)}</span>);
    return node;
  };
  return walk(children);
}

export function DocumentPanel({ props }: { id: string; props: Record<string, unknown> }) {
  const text = typeof props.text === "string" ? props.text : "";
  const title = typeof props.title === "string" ? props.title : "Document";
  const needle = typeof props.highlight === "string" ? props.highlight : "";
  const lang = props.lang === "ar" ? "ar" : "en";
  const H = ({ children }: { children?: ReactNode }) => <>{highlight(children, needle)}</>;
  return (
    <section className="rounded-md border border-line bg-card" dir={lang === "ar" ? "rtl" : "ltr"}>
      <header className="flex items-center gap-2 border-b border-line px-5 py-3">
        <span className="font-mono text-sm">{title}</span>
      </header>
      <div className={`prose-doc max-h-[60vh] overflow-auto p-6 ${lang === "ar" ? "ar" : ""}`}>
        <ReactMarkdown components={{
          p: ({ children }) => <p><H>{children}</H></p>,
          li: ({ children }) => <li><H>{children}</H></li>,
          h1: ({ children }) => <h1><H>{children}</H></h1>,
          h2: ({ children }) => <h2><H>{children}</H></h2>,
          h3: ({ children }) => <h3><H>{children}</H></h3>,
        }}>{text}</ReactMarkdown>
      </div>
    </section>
  );
}
