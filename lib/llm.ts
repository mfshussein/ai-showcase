import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Provider selection                                                  */
/* ------------------------------------------------------------------ */

export type Prices = Record<string, [number, number]>;

export type Provider =
  | { kind: "anthropic"; models: { main: string; fast: string }; label: string; prices?: Prices }
  | { kind: "openai"; baseURL: string; apiKey: string; models: { main: string; fast: string }; label: string; prices?: Prices };

/** USD per million tokens: [input, output]. Checked October 2026; override with LLM_PRICE_MAIN / LLM_PRICE_FAST ("in,out"). */
const KNOWN_PRICES: Prices = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
  "qwen3.8-max": [2, 6],
  "qwen3.8-flash": [0.14, 0.42],
  "deepseek-v4-pro": [1.32, 3.96],
  "deepseek-flash": [0.3, 1.2],
  "kimi-k3": [3, 15],
  "kimi-k2.6": [0.95, 4],
  "glm-5.3": [1.4, 4.4],
  "glm-5.3-flash": [0.15, 0.5],
  "MiniMax-M3": [0.3, 1.2],
  // OpenRouter ids (list price, October 2026)
  "qwen/qwen3.8-max-0902": [2, 6],
  "qwen/qwen3.8-flash": [0.15, 0.47],
  "deepseek/deepseek-v4-pro-0813": [0.66, 1.98],
  "deepseek/deepseek-v4.1-flash": [0.05, 1.2],
  "moonshotai/kimi-k3": [3, 15],
  "minimax/minimax-m3": [0.3, 1.2],
  "z-ai/glm-5.3-flash": [0.15, 0.5],
  "google/gemini-3.8-flash": [0.75, 3.75],
};

function parsePrice(s: string | undefined): [number, number] | undefined {
  if (!s) return undefined;
  const [a, b] = s.split(",").map((x) => Number(x.trim()));
  return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : undefined;
}

export function resolveProvider(env: Record<string, string | undefined> = process.env): Provider {
  const kind = (env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  const prices: Prices = {};
  if (kind === "openai" || kind === "openai-compatible") {
    const baseURL = env.LLM_BASE_URL;
    const apiKey = env.LLM_API_KEY;
    if (!baseURL || !apiKey) throw new Error("LLM_PROVIDER=openai needs LLM_BASE_URL and LLM_API_KEY");
    const models = { main: env.MODEL_MAIN ?? "qwen3.8-max", fast: env.MODEL_FAST ?? "qwen3.8-flash" };
    const pm = parsePrice(env.LLM_PRICE_MAIN);
    const pf = parsePrice(env.LLM_PRICE_FAST);
    if (pm) prices[models.main] = pm;
    if (pf) prices[models.fast] = pf;
    const host = new URL(baseURL).hostname;
    return { kind: "openai", baseURL, apiKey, models, label: `${models.main} via ${host}`, ...(Object.keys(prices).length ? { prices } : {}) };
  }
  const models = { main: env.MODEL_MAIN ?? "claude-opus-5-5", fast: env.MODEL_FAST ?? "claude-sonnet-5-5" };
  return { kind: "anthropic", models, label: `${models.main} via Anthropic` };
}

export function costUsd(model: string, inTok: number, outTok: number, override?: Prices): number {
  const p = override?.[model] ?? KNOWN_PRICES[model];
  if (!p) return 0;
  return (inTok * p[0] + outTok * p[1]) / 1_000_000;
}

/* ------------------------------------------------------------------ */
/* Common interface                                                    */
/* ------------------------------------------------------------------ */

type Common = {
  system?: string;
  prompt: string;
  model?: "main" | "fast";
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
};
type ImageInput = { data: string; mediaType: "image/png" | "image/jpeg" | "image/webp" };

export interface Llm {
  text(o: Common): Promise<string>;
  /** Yields text deltas. */
  stream(o: Common): AsyncGenerator<string>;
  parse<T>(o: Common & { schema: z.ZodType<T> }): Promise<T>;
  vision<T>(o: { image: ImageInput; prompt: string; system?: string; schema?: z.ZodType<T>; model?: "main" | "fast" }): Promise<T | string>;
  usage(): { inputTokens: number; outputTokens: number; costUsd: number };
  /** Human-readable "model via host" for the evidence drawer. */
  label: string;
}

function usageTracker(prices?: Prices) {
  const u = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  return {
    add(model: string, inTok: number | undefined, outTok: number | undefined) {
      if (inTok === undefined || outTok === undefined) return;
      u.inputTokens += inTok;
      u.outputTokens += outTok;
      u.costUsd += costUsd(model, inTok, outTok, prices);
    },
    get: () => ({ ...u }),
  };
}

export function createLlm(provider: Provider = resolveProvider()): Llm {
  return provider.kind === "anthropic" ? createAnthropicLlm(provider) : createOpenAiCompatibleLlm(provider);
}

/* ------------------------------------------------------------------ */
/* Anthropic                                                           */
/* ------------------------------------------------------------------ */

export function createAnthropicLlm(provider: Extract<Provider, { kind: "anthropic" }>): Llm {
  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
  const MODEL = provider.models;
  const track = usageTracker(provider.prices);
  const add = (model: string, usage: { input_tokens: number; output_tokens: number } | null | undefined) => track.add(model, usage?.input_tokens, usage?.output_tokens);
  const textOf = (content: { type: string; text?: string }[]) => content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  const fail = (res: { parsed_output?: unknown }) => { if (res.parsed_output === null || res.parsed_output === undefined) throw new Error("structured output failed to parse"); };

  return {
    label: provider.label,
    async text(o) {
      const model = MODEL[o.model ?? "main"];
      const res = await client.beta.messages.create({
        model, max_tokens: o.maxTokens ?? 4000, system: o.system,
        output_config: { effort: o.effort ?? "medium" },
        betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
        messages: [{ role: "user", content: o.prompt }],
      });
      add(model, res.usage);
      if (res.stop_reason === "refusal") throw new Error("model refused the request");
      return textOf(res.content);
    },
    async *stream(o) {
      const model = MODEL[o.model ?? "main"];
      const s = client.beta.messages.stream({
        model, max_tokens: o.maxTokens ?? 4000, system: o.system,
        output_config: { effort: o.effort ?? "medium" },
        betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
        messages: [{ role: "user", content: o.prompt }],
      });
      for await (const ev of s) {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield ev.delta.text;
      }
      const final = await s.finalMessage();
      add(model, final.usage);
    },
    async parse(o) {
      const model = MODEL[o.model ?? "main"];
      const res = await client.messages.parse({
        model, max_tokens: o.maxTokens ?? 4000, system: o.system,
        output_config: { effort: o.effort ?? "medium", format: zodOutputFormat(o.schema) },
        messages: [{ role: "user", content: o.prompt }],
      });
      add(model, res.usage);
      fail(res);
      return res.parsed_output as z.infer<typeof o.schema>;
    },
    async vision(o) {
      const model = MODEL[o.model ?? "main"];
      const content: Anthropic.ContentBlockParam[] = [
        { type: "image", source: { type: "base64", media_type: o.image.mediaType, data: o.image.data } },
        { type: "text", text: o.prompt },
      ];
      if (o.schema) {
        const res = await client.messages.parse({
          model, max_tokens: 4000, system: o.system,
          output_config: { effort: "medium", format: zodOutputFormat(o.schema) },
          messages: [{ role: "user", content }],
        });
        add(model, res.usage);
        fail(res);
        return res.parsed_output as z.infer<typeof o.schema>;
      }
      const res = await client.messages.create({
        model, max_tokens: 4000, system: o.system, output_config: { effort: "medium" }, messages: [{ role: "user", content }],
      });
      add(model, res.usage);
      return textOf(res.content);
    },
    usage: track.get,
  };
}

/* ------------------------------------------------------------------ */
/* OpenAI-compatible (Qwen, DeepSeek, Kimi, GLM, MiniMax, OpenRouter)  */
/* ------------------------------------------------------------------ */

function stripFences(s: string): string {
  const m = /```(?:json)?\s*([\s\S]*?)```/i.exec(s);
  return (m ? m[1] : s).trim();
}

function schemaHint(schema: z.ZodType): string {
  try {
    return JSON.stringify(z.toJSONSchema(schema));
  } catch {
    return "the requested JSON object";
  }
}

export function createOpenAiCompatibleLlm(provider: Extract<Provider, { kind: "openai" }>, fetchImpl?: typeof fetch): Llm {
  const client = new OpenAI({ baseURL: provider.baseURL, apiKey: provider.apiKey, timeout: 90_000, maxRetries: 1, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  const MODEL = provider.models;
  const track = usageTracker(provider.prices);
  const add = (model: string, usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined) => track.add(model, usage?.prompt_tokens, usage?.completion_tokens);
  const msgs = (system: string | undefined, user: OpenAI.ChatCompletionUserMessageParam["content"]): OpenAI.ChatCompletionMessageParam[] =>
    [...(system ? [{ role: "system" as const, content: system }] : []), { role: "user" as const, content: user }];

  async function complete(model: string, messages: OpenAI.ChatCompletionMessageParam[], maxTokens: number, json: boolean): Promise<string> {
    const res = await client.chat.completions.create({
      model, messages, max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" as const } } : {}),
    });
    add(model, res.usage);
    return res.choices[0]?.message?.content ?? "";
  }

  async function parseWith<T>(model: string, messages: OpenAI.ChatCompletionMessageParam[], schema: z.ZodType<T>, maxTokens: number): Promise<T> {
    const first = await complete(model, messages, maxTokens, true);
    let problem: string;
    try {
      return schema.parse(JSON.parse(stripFences(first)));
    } catch (e) {
      problem = e instanceof Error ? e.message : String(e);
    }
    const retry: OpenAI.ChatCompletionMessageParam[] = [
      ...messages,
      { role: "assistant", content: first },
      { role: "user", content: `That JSON did not match the schema: ${problem.slice(0, 400)}. Reply with only a corrected JSON object matching this schema: ${schemaHint(schema)}` },
    ];
    const second = await complete(model, retry, maxTokens, true);
    try {
      return schema.parse(JSON.parse(stripFences(second)));
    } catch {
      throw new Error("structured output failed to parse after one retry");
    }
  }

  const withSchema = (system: string | undefined, schema: z.ZodType) =>
    `${system ? system + "\n\n" : ""}Respond with a single JSON object and nothing else. It must match this JSON schema: ${schemaHint(schema)}`;

  return {
    label: provider.label,
    async text(o) {
      return complete(MODEL[o.model ?? "main"], msgs(o.system, o.prompt), o.maxTokens ?? 4000, false);
    },
    async *stream(o) {
      const model = MODEL[o.model ?? "main"];
      const s = await client.chat.completions.create({ model, messages: msgs(o.system, o.prompt), max_tokens: o.maxTokens ?? 4000, stream: true, stream_options: { include_usage: true } });
      for await (const chunk of s) {
        const d = chunk.choices[0]?.delta?.content;
        if (d) yield d;
        if (chunk.usage) add(model, chunk.usage);
      }
    },
    async parse(o) {
      return parseWith(MODEL[o.model ?? "main"], msgs(withSchema(o.system, o.schema), o.prompt), o.schema, o.maxTokens ?? 4000);
    },
    async vision(o) {
      const model = MODEL[o.model ?? "main"];
      const content: OpenAI.ChatCompletionContentPart[] = [
        { type: "image_url", image_url: { url: `data:${o.image.mediaType};base64,${o.image.data}` } },
        { type: "text", text: o.prompt },
      ];
      if (o.schema) return parseWith(model, msgs(withSchema(o.system, o.schema), content), o.schema, 4000);
      return complete(model, msgs(o.system, content), 4000, false);
    },
    usage: track.get,
  };
}
