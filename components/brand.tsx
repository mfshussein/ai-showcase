import Link from "next/link";

export function Brand({ sub }: { sub?: string }) {
  return (
    <Link href="/" className="inline-flex items-baseline gap-2 text-fg no-underline">
      <span className="text-base font-semibold tracking-tight">Cypher-One</span>
      <span className="text-sm text-muted">{sub ?? "AI Showcase"}</span>
    </Link>
  );
}
