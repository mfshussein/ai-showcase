import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

export const MODEL = {
  main: process.env.MODEL_MAIN ?? "claude-opus-5-5",
  fast: process.env.MODEL_FAST ?? "claude-sonnet-5-5",
} as const;

/** USD per million tokens: [input, output]. */
const PRICE: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
};

export function costUsd(model: string, inTok: number, outTok: number): number {
  const p = PRICE[model];
  if (!p) return 0;
  return (inTok * p[0] + outTok * p[1]) / 1_000_000;
}

type Common = {
  system?: string;
  prompt: string;
  model?: keyof typeof MODEL;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
};
type ImageInput = { data: string; mediaType: "image/png" | "image/jpeg" | "image/webp" };

export interface Llm {
  text(o: Common): Promise<string>;
  /** Yields text deltas. */
  stream(o: Common): AsyncGenerator<string>;
  parse<T>(o: Common & { schema: z.ZodType<T> }): Promise<T>;
  vision<T>(o: { image: ImageInput; prompt: string; system?: string; schema?: z.ZodType<T>; model?: keyof typeof MODEL }): Promise<T | string>;
  usage(): { inputTokens: number; outputTokens: number; costUsd: number };
}

type Usage = { input_tokens: number; output_tokens: number } | null | undefined;

export function createLlm(): Llm {
  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
  const u = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  const add = (model: string, usage: Usage) => {
    if (!usage) return;
    u.inputTokens += usage.input_tokens;
    u.outputTokens += usage.output_tokens;
    u.costUsd += costUsd(model, usage.input_tokens, usage.output_tokens);
  };
  const textOf = (content: { type: string; text?: string }[]) => content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");

  return {
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
      if (res.parsed_output === null || res.parsed_output === undefined) throw new Error("structured output failed to parse");
      return res.parsed_output;
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
        if (res.parsed_output === null || res.parsed_output === undefined) throw new Error("structured output failed to parse");
        return res.parsed_output;
      }
      const res = await client.messages.create({
        model, max_tokens: 4000, system: o.system, output_config: { effort: "medium" }, messages: [{ role: "user", content }],
      });
      add(model, res.usage);
      return textOf(res.content);
    },
    usage: () => ({ ...u }),
  };
}
