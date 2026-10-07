import { safeNext } from "@/lib/auth";

export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  const sp = await searchParams;
  const error = sp.error === "1";
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form method="post" action="/api/unlock" className="w-full max-w-md rounded-md border border-line bg-card p-10">
        <p className="text-sm text-muted">Cypher-One</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">AI Showcase</h1>
        <p className="mt-3 text-base text-muted">Every safeguard is a system control, not a policy document.</p>
        <input type="hidden" name="next" value={next} />
        <label className="mt-8 block text-sm font-medium" htmlFor="password">Access code</label>
        <input
          id="password" name="password" type="password" autoFocus autoComplete="current-password" required
          className="mt-2 w-full rounded-md border border-line bg-bg px-4 py-3 text-lg outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        {error && <p className="mt-3 text-sm text-block">That code didn&apos;t work. Check it and try again.</p>}
        <button type="submit" className="mt-6 w-full rounded-md bg-accent px-4 py-3 text-base font-semibold text-white hover:bg-[#1239b0] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
          Open the showcase
        </button>
      </form>
    </main>
  );
}
