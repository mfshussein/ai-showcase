import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Provider selection                                                  */
/* ------------------------------------------------------------------ */

export type Prices = Record<string, [number, number]>;

/** `vision`, when set, is used for every image call (a fast multimodal model keeps "read in seconds" true). */
type Models = { main: string; fast: string; vision?: string };
export type Provider =
  | { kind: "anthropic"; models: Models; label: string; prices?: Prices }
  | { kind: "openai"; baseURL: string; apiKey: string; models: Models; label: string; prices?: Prices };

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
    const models: Models = { main: env.MODEL_MAIN ?? "qwen3.8-max", fast: env.MODEL_FAST ?? "qwen3.8-flash", ...(env.MODEL_VISION ? { vision: env.MODEL_VISION } : {}) };
    const pm = parsePrice(env.LLM_PRICE_MAIN);
    const pf = parsePrice(env.LLM_PRICE_FAST);
    if (pm) prices[models.main] = pm;
    if (pf) prices[models.fast] = pf;
    const host = new URL(baseURL).hostname;
    return { kind: "openai", baseURL, apiKey, models, label: `${models.main} via ${host}`, ...(Object.keys(prices).length ? { prices } : {}) };
  }
  const models: Models = { main: env.MODEL_MAIN ?? "claude-opus-5-5", fast: env.MODEL_FAST ?? "claude-sonnet-5-5", ...(env.MODEL_VISION ? { vision: env.MODEL_VISION } : {}) };
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

/** A tool the model may call. `run` receives arguments already validated against `parameters`. */
export type ToolDef = { name: string; description: string; parameters: z.ZodType; run: (args: unknown) => Promise<unknown> };
export type ToolStep =
  | { type: "call"; id: string; name: string; args: unknown }
  | { type: "result"; id: string; name: string; result: unknown }
  | { type: "final"; text: string };

export interface Llm {
  text(o: Common): Promise<string>;
  /** Yields text deltas. */
  stream(o: Common): AsyncGenerator<string>;
  parse<T>(o: Common & { schema: z.ZodType<T> }): Promise<T>;
  vision<T>(o: { image: ImageInput; prompt: string; system?: string; schema?: z.ZodType<T>; model?: "main" | "fast"; effort?: "low" | "medium" | "high" }): Promise<T | string>;
  /** Tool-calling loop: yields each call, its result, and the final reply. Stops after maxSteps (default 8) model turns. */
  tools(o: Common & { tools: ToolDef[]; maxSteps?: number }): AsyncGenerator<ToolStep>;
  usage(): { inputTokens: number; outputTokens: number; costUsd: number };
  /** Human-readable "model via host" for the evidence drawer. */
  label: string;
  /** The model image calls use, when it differs from main. */
  visionModel?: string;
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
    /** When the gateway reports the exact charge, use it instead of the price table. */
    addExact(inTok: number, outTok: number, cost: number) {
      u.inputTokens += inTok;
      u.outputTokens += outTok;
      u.costUsd += cost;
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
    visionModel: MODEL.vision,
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
      const model = MODEL.vision ?? MODEL[o.model ?? "main"];
      const content: Anthropic.ContentBlockParam[] = [
        { type: "image", source: { type: "base64", media_type: o.image.mediaType, data: o.image.data } },
        { type: "text", text: o.prompt },
      ];
      if (o.schema) {
        const res = await client.messages.parse({
          model, max_tokens: 4000, system: o.system,
          output_config: { effort: o.effort ?? "medium", format: zodOutputFormat(o.schema) },
          messages: [{ role: "user", content }],
        });
        add(model, res.usage);
        fail(res);
        return res.parsed_output as z.infer<typeof o.schema>;
      }
      const res = await client.messages.create({
        model, max_tokens: 4000, system: o.system, output_config: { effort: o.effort ?? "medium" }, messages: [{ role: "user", content }],
      });
      add(model, res.usage);
      return textOf(res.content);
    },
    async *tools() {
      throw new Error("tools() is not implemented for the Anthropic provider yet; use LLM_PROVIDER=openai");
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

/** Reasoning models count their thinking against max_tokens; keep room for it so visible answers are not truncated. */
const REASONING_ALLOWANCE = 4000;

export function createOpenAiCompatibleLlm(provider: Extract<Provider, { kind: "openai" }>, fetchImpl?: typeof fetch): Llm {
  const client = new OpenAI({ baseURL: provider.baseURL, apiKey: provider.apiKey, timeout: 120_000, maxRetries: 1, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  const MODEL = provider.models;
  const openRouter = new URL(provider.baseURL).hostname.endsWith("openrouter.ai");
  const track = usageTracker(provider.prices);
  type OrUsage = { prompt_tokens?: number; completion_tokens?: number; cost?: number } | null | undefined;
  const add = (model: string, usage: OrUsage) => {
    if (usage && typeof usage.cost === "number") track.addExact(usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0, usage.cost);
    else track.add(model, usage?.prompt_tokens, usage?.completion_tokens);
  };
  const budget = (maxTokens: number | undefined) => (maxTokens ?? 4000) + (openRouter ? REASONING_ALLOWANCE : 0);
  const extra = (effort: "low" | "medium" | "high" | undefined) => (openRouter ? { reasoning: { effort: effort ?? "medium" } } : {});
  const msgs = (system: string | undefined, user: OpenAI.ChatCompletionUserMessageParam["content"]): OpenAI.ChatCompletionMessageParam[] =>
    [...(system ? [{ role: "system" as const, content: system }] : []), { role: "user" as const, content: user }];

  type Effort = "low" | "medium" | "high" | undefined;
  async function complete(model: string, messages: OpenAI.ChatCompletionMessageParam[], maxTokens: number | undefined, json: boolean, effort: Effort): Promise<string> {
    const res = await client.chat.completions.create({
      model, messages, max_tokens: budget(maxTokens),
      ...(json ? { response_format: { type: "json_object" as const } } : {}),
      ...extra(effort),
    });
    add(model, res.usage);
    return res.choices[0]?.message?.content ?? "";
  }

  async function parseWith<T>(model: string, messages: OpenAI.ChatCompletionMessageParam[], schema: z.ZodType<T>, maxTokens: number | undefined, effort: Effort): Promise<T> {
    const first = await complete(model, messages, maxTokens, true, effort);
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
    const second = await complete(model, retry, maxTokens, true, effort);
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
    visionModel: MODEL.vision,
    async text(o) {
      return complete(MODEL[o.model ?? "main"], msgs(o.system, o.prompt), o.maxTokens, false, o.effort);
    },
    async *stream(o) {
      const model = MODEL[o.model ?? "main"];
      const s = await client.chat.completions.create({ model, messages: msgs(o.system, o.prompt), max_tokens: budget(o.maxTokens), stream: true, stream_options: { include_usage: true }, ...extra(o.effort) });
      for await (const chunk of s) {
        const d = chunk.choices[0]?.delta?.content;
        if (d) yield d;
        if (chunk.usage) add(model, chunk.usage);
      }
    },
    async parse(o) {
      return parseWith(MODEL[o.model ?? "main"], msgs(withSchema(o.system, o.schema), o.prompt), o.schema, o.maxTokens, o.effort);
    },
    async vision(o) {
      const model = MODEL.vision ?? MODEL[o.model ?? "main"];
      const content: OpenAI.ChatCompletionContentPart[] = [
        { type: "image_url", image_url: { url: `data:${o.image.mediaType};base64,${o.image.data}` } },
        { type: "text", text: o.prompt },
      ];
      if (o.schema) return parseWith(model, msgs(withSchema(o.system, o.schema), content), o.schema, undefined, o.effort ?? "medium");
      return complete(model, msgs(o.system, content), undefined, false, o.effort ?? "medium");
    },
    async *tools(o) {
      const model = MODEL[o.model ?? "main"];
      const maxSteps = o.maxSteps ?? 8;
      const byName = new Map(o.tools.map((t) => [t.name, t]));
      const toolSpecs: OpenAI.ChatCompletionTool[] = o.tools.map((t) => ({
        type: "function", function: { name: t.name, description: t.description, parameters: z.toJSONSchema(t.parameters) as Record<string, unknown> },
      }));
      const messages = msgs(o.system, o.prompt);
      for (let step = 0; step < maxSteps; step++) {
        const res = await client.chat.completions.create({ model, messages, tools: toolSpecs, max_tokens: budget(o.maxTokens), ...extra(o.effort) });
        add(model, res.usage);
        const msg = res.choices[0]?.message;
        const calls = (msg?.tool_calls ?? []).filter((c) => c.type === "function");
        if (!msg || calls.length === 0) {
          yield { type: "final", text: msg?.content ?? "" };
          return;
        }
        messages.push(msg);
        for (const c of calls) {
          let args: unknown = null;
          let result: unknown;
          const tool = byName.get(c.function.name);
          try {
            args = JSON.parse(c.function.arguments || "{}");
          } catch {
            result = { error: "invalid arguments: not valid JSON" };
          }
          yield { type: "call", id: c.id, name: c.function.name, args };
          if (result === undefined) {
            if (!tool) result = { error: `unknown tool ${c.function.name}` };
            else {
              const parsed = tool.parameters.safeParse(args);
              if (!parsed.success) result = { error: `invalid arguments: ${parsed.error.message.slice(0, 300)}` };
              else {
                try {
                  result = await tool.run(parsed.data);
                } catch (e) {
                  result = { error: e instanceof Error ? e.message : String(e) };
                }
              }
            }
          }
          yield { type: "result", id: c.id, name: c.function.name, result };
          messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(result) });
        }
      }
      yield { type: "final", text: `(stopped after ${maxSteps} steps)` };
    },
    usage: track.get,
  };
}
