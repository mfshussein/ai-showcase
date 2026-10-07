import { requirePresenter } from "@/lib/session";
import { runners } from "@/demos/runners";
import { createLlm } from "@/lib/llm";
import { stamp } from "@/lib/stamp";
import { makeFixtureLoader } from "@/lib/fixtures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await requirePresenter())) return new Response("presenter only", { status: 403 });
  const { slug } = await params;
  const load = runners[slug];
  if (!load) return new Response("unknown demo", { status: 404 });
  const { run } = await load();
  const ctx = { mode: "live" as const, llm: createLlm(), ...makeFixtureLoader(slug) };
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(c) {
      try {
        for await (const ev of stamp(run(ctx))) c.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
      } catch (e) {
        c.enqueue(enc.encode(`event: error\ndata: ${JSON.stringify({ message: (e as Error).message })}\n\n`));
      } finally {
        c.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } });
}
