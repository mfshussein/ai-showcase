import { requirePresenter } from "@/lib/session";
import { demos } from "@/demos/registry";
import { goldens } from "@/demos/goldens";
import { createLlm, resolveProvider } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requirePresenter())) return new Response("presenter only", { status: 403 });
  const probe = new URL(req.url).searchParams.get("probe") === "1";
  const ready = demos.filter((d) => d.status === "ready").map((d) => d.slug);
  let provider: ReturnType<typeof resolveProvider> | null = null;
  let providerError: string | undefined;
  try { provider = resolveProvider(); } catch (e) { providerError = (e as Error).message; }
  const hasKey = provider?.kind === "openai" ? Boolean(provider.apiKey) : Boolean(process.env.ANTHROPIC_API_KEY);
  const body: Record<string, unknown> = {
    apiKey: hasKey,
    provider: provider?.kind ?? "misconfigured",
    providerError,
    model: provider?.models.main ?? "",
    fastModel: provider?.models.fast ?? "",
    label: provider?.label ?? providerError,
    goldens: ready.map((slug) => ({ slug, loaded: Boolean(goldens[slug]) })),
    viewerPassword: Boolean(process.env.VIEWER_PASSWORD),
    cookieSecret: Boolean(process.env.COOKIE_SECRET),
  };
  if (probe) {
    const t = Date.now();
    try {
      if (!provider) throw new Error(providerError ?? "provider misconfigured");
      const text = await createLlm(provider).text({ model: "fast", prompt: "Reply with the single word: ready", maxTokens: 20, effort: "low" });
      body.probe = { ok: true, latencyMs: Date.now() - t, text: text.trim() };
    } catch (e) {
      body.probe = { ok: false, latencyMs: Date.now() - t, error: (e as Error).message };
    }
  }
  return Response.json(body);
}
