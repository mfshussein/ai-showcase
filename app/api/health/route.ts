import { requirePresenter } from "@/lib/session";
import { demos } from "@/demos/registry";
import { goldens } from "@/demos/goldens";
import { createLlm, MODEL } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requirePresenter())) return new Response("presenter only", { status: 403 });
  const probe = new URL(req.url).searchParams.get("probe") === "1";
  const ready = demos.filter((d) => d.status === "ready").map((d) => d.slug);
  const body: Record<string, unknown> = {
    apiKey: Boolean(process.env.ANTHROPIC_API_KEY),
    model: MODEL.main,
    fastModel: MODEL.fast,
    goldens: ready.map((slug) => ({ slug, loaded: Boolean(goldens[slug]) })),
    viewerPassword: Boolean(process.env.VIEWER_PASSWORD),
    cookieSecret: Boolean(process.env.COOKIE_SECRET),
  };
  if (probe) {
    const t = Date.now();
    try {
      const text = await createLlm().text({ model: "fast", prompt: "Reply with the single word: ready", maxTokens: 20, effort: "low" });
      body.probe = { ok: true, latencyMs: Date.now() - t, text: text.trim() };
    } catch (e) {
      body.probe = { ok: false, latencyMs: Date.now() - t, error: (e as Error).message };
    }
  }
  return Response.json(body);
}
