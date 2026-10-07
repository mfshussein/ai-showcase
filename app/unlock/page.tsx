export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  const sp = await searchParams;
  const error = sp.error === "1";
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/";
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form method="post" action="/api/unlock" className="w-full max-w-md rounded-2xl border border-line bg-card p-10 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Cypher-One</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">AI Showcase</h1>
        <p className="mt-3 text-base text-muted">Every safeguard is a system control, not a policy document.</p>
        <input type="hidden" name="next" value={next} />
        <label className="mt-8 block text-sm font-medium" htmlFor="password">Access code</label>
        <input
          id="password" name="password" type="password" autoFocus autoComplete="current-password" required
          className="mt-2 w-full rounded-lg border border-line bg-bg px-4 py-3 text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
        {error && <p className="mt-3 text-sm text-block">That code didn&apos;t work. Try again.</p>}
        <button type="submit" className="mt-6 w-full rounded-lg bg-fg px-4 py-3 text-base font-semibold text-white hover:bg-black">
          Enter
        </button>
      </form>
    </main>
  );
}
