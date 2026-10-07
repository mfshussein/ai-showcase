import { describe, it, expect } from "vitest";
import { z } from "zod";
import { costUsd, resolveProvider, createOpenAiCompatibleLlm } from "./llm";

describe("costUsd", () => {
  it("prices opus 5.5 at $4/$20 per MTok", () => { expect(costUsd("claude-opus-5-5", 1_000_000, 1_000_000)).toBeCloseTo(24); });
  it("prices sonnet 5.5 at $2/$10", () => { expect(costUsd("claude-sonnet-5-5", 500_000, 100_000)).toBeCloseTo(2); });
  it("prices qwen3.8-max at $2/$6 and deepseek-v4-pro at $1.32/$3.96", () => {
    expect(costUsd("qwen3.8-max", 1_000_000, 1_000_000)).toBeCloseTo(8);
    expect(costUsd("deepseek-v4-pro", 1_000_000, 1_000_000)).toBeCloseTo(5.28);
    expect(costUsd("qwen/qwen3.8-flash", 1_000_000, 1_000_000)).toBeCloseTo(0.62);
  });
  it("unknown model costs 0 unless an override is given", () => {
    expect(costUsd("x", 1, 1)).toBe(0);
    expect(costUsd("x", 1_000_000, 1_000_000, { x: [1, 2] })).toBeCloseTo(3);
  });
});

describe("resolveProvider", () => {
  it("defaults to anthropic", () => {
    expect(resolveProvider({}).kind).toBe("anthropic");
  });
  it("selects openai-compatible with base url, key and models from env", () => {
    const p = resolveProvider({ LLM_PROVIDER: "openai", LLM_BASE_URL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", LLM_API_KEY: "k", MODEL_MAIN: "qwen3.8-max", MODEL_FAST: "qwen3.8-flash" });
    expect(p).toEqual({ kind: "openai", baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", apiKey: "k", models: { main: "qwen3.8-max", fast: "qwen3.8-flash" }, label: "qwen3.8-max via dashscope-intl.aliyuncs.com" });
  });
  it("reads an optional vision model", () => {
    const p = resolveProvider({ LLM_PROVIDER: "openai", LLM_BASE_URL: "https://x.example/v1", LLM_API_KEY: "k", MODEL_VISION: "google/gemini-3.8-flash" });
    expect(p.models.vision).toBe("google/gemini-3.8-flash");
  });
  it("reads a price override of the form in,out", () => {
    const p = resolveProvider({ LLM_PROVIDER: "openai", LLM_BASE_URL: "https://x.example/v1", LLM_API_KEY: "k", MODEL_MAIN: "m", MODEL_FAST: "f", LLM_PRICE_MAIN: "1.5,6", LLM_PRICE_FAST: "0.1,0.4" });
    expect(p.kind === "openai" && p.prices).toEqual({ m: [1.5, 6], f: [0.1, 0.4] });
  });
  it("throws when openai is selected without a base url or key", () => {
    expect(() => resolveProvider({ LLM_PROVIDER: "openai" })).toThrow(/LLM_BASE_URL/);
  });
});

/** A fake OpenAI-compatible server: answers chat completions from a queue. */
function fakeServer(responses: (string | { error: true })[], withCost = false) {
  const calls: { body: Record<string, unknown> }[] = [];
  const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    calls.push({ body });
    const next = responses.shift();
    if (!next) return new Response("no more", { status: 500 });
    if (typeof next !== "string") return new Response(JSON.stringify({ error: { message: "boom" } }), { status: 500 });
    const json = { id: "x", object: "chat.completion", created: 0, model: String(body.model), choices: [{ index: 0, message: { role: "assistant", content: next }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15, ...(withCost ? { cost: 0.0123 } : {}) } };
    return new Response(JSON.stringify(json), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

describe("createOpenAiCompatibleLlm", () => {
  const provider = { kind: "openai" as const, baseURL: "https://x.example/v1", apiKey: "k", models: { main: "m", fast: "f" }, label: "m via x.example", prices: { m: [1, 2] as [number, number], f: [0.1, 0.2] as [number, number] } };
  it("text() sends the system and prompt and accumulates cost", async () => {
    const srv = fakeServer(["hello"]);
    const llm = createOpenAiCompatibleLlm(provider, srv.fetchImpl);
    expect(await llm.text({ system: "sys", prompt: "hi", model: "fast" })).toBe("hello");
    expect(srv.calls[0].body.model).toBe("f");
    expect(srv.calls[0].body.messages).toEqual([{ role: "system", content: "sys" }, { role: "user", content: "hi" }]);
    expect(llm.usage()).toEqual({ inputTokens: 10, outputTokens: 5, costUsd: (10 * 0.1 + 5 * 0.2) / 1_000_000 });
  });
  it("parse() validates against the schema and retries once with the validation error", async () => {
    const srv = fakeServer(['{"ok": "yes"}', '{"ok": true}']);
    const llm = createOpenAiCompatibleLlm(provider, srv.fetchImpl);
    const out = await llm.parse({ prompt: "p", schema: z.object({ ok: z.boolean() }) });
    expect(out).toEqual({ ok: true });
    expect(srv.calls).toHaveLength(2);
    expect(srv.calls[0].body.response_format).toEqual({ type: "json_object" });
    expect(String((srv.calls[1].body.messages as { content: string }[]).at(-1)?.content)).toMatch(/ok/);
  });
  it("parse() strips code fences and gives up after the retry", async () => {
    const srv = fakeServer(['```json\n{"ok": true}\n```']);
    const llm = createOpenAiCompatibleLlm(provider, srv.fetchImpl);
    expect(await llm.parse({ prompt: "p", schema: z.object({ ok: z.boolean() }) })).toEqual({ ok: true });
    const bad = fakeServer(["nope", "still nope"]);
    await expect(createOpenAiCompatibleLlm(provider, bad.fetchImpl).parse({ prompt: "p", schema: z.object({ ok: z.boolean() }) })).rejects.toThrow(/structured output/);
  });
  it("sends reasoning effort and a reasoning allowance on max_tokens for OpenRouter, and prefers the reported cost", async () => {
    const srv = fakeServer(["ok"], true);
    const or = { ...provider, baseURL: "https://openrouter.ai/api/v1" };
    const llm = createOpenAiCompatibleLlm(or, srv.fetchImpl);
    await llm.text({ prompt: "hi", maxTokens: 300, effort: "low" });
    expect(srv.calls[0].body.reasoning).toEqual({ effort: "low" });
    expect(srv.calls[0].body.max_tokens).toBe(300 + 4000);
    expect(llm.usage().costUsd).toBeCloseTo(0.0123);
  });
  it("does not send reasoning options to other hosts", async () => {
    const srv = fakeServer(["ok"]);
    const llm = createOpenAiCompatibleLlm(provider, srv.fetchImpl);
    await llm.text({ prompt: "hi", maxTokens: 300 });
    expect(srv.calls[0].body.reasoning).toBeUndefined();
    expect(srv.calls[0].body.max_tokens).toBe(300);
  });
  it("vision() passes the requested reasoning effort to OpenRouter", async () => {
    const or = { ...provider, baseURL: "https://openrouter.ai/api/v1" };
    const srv = fakeServer(["ok"]);
    await createOpenAiCompatibleLlm(or, srv.fetchImpl).vision({ image: { data: "AAAA", mediaType: "image/png" }, prompt: "p", effort: "low" });
    expect(srv.calls[0].body.reasoning).toEqual({ effort: "low" });
  });
  it("vision() uses the vision model when one is configured, and says so", async () => {
    const srv = fakeServer(["ok"]);
    const llm = createOpenAiCompatibleLlm({ ...provider, models: { ...provider.models, vision: "v" } }, srv.fetchImpl);
    await llm.vision({ image: { data: "AAAA", mediaType: "image/png" }, prompt: "p" });
    expect(srv.calls[0].body.model).toBe("v");
    expect(llm.visionModel).toBe("v");
  });
  it("vision() sends an image_url data URL", async () => {
    const srv = fakeServer(["a chart"]);
    const llm = createOpenAiCompatibleLlm(provider, srv.fetchImpl);
    expect(await llm.vision({ image: { data: "AAAA", mediaType: "image/png" }, prompt: "describe" })).toBe("a chart");
    const content = (srv.calls[0].body.messages as { content: unknown }[])[0].content as { type: string; image_url?: { url: string } }[];
    expect(content[0]).toEqual({ type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } });
  });
});

/** A fake server whose replies may carry tool calls. */
type Reply = { content?: string; calls?: { name: string; args: string }[] };
function toolServer(replies: Reply[]) {
  const calls: { body: Record<string, unknown> }[] = [];
  let n = 0;
  const fetchImpl = async (_url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    calls.push({ body });
    const r = replies.shift() ?? { calls: [{ name: "echo", args: "{\"text\":\"again\"}" }] };
    const tool_calls = r.calls?.map((c) => ({ id: `call_${++n}`, type: "function", function: { name: c.name, arguments: c.args } }));
    const json = { id: "x", object: "chat.completion", created: 0, model: String(body.model), choices: [{ index: 0, message: { role: "assistant", content: r.content ?? null, ...(tool_calls ? { tool_calls } : {}) }, finish_reason: tool_calls ? "tool_calls" : "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
    return new Response(JSON.stringify(json), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

describe("tools()", () => {
  const provider = { kind: "openai" as const, baseURL: "https://x.example/v1", apiKey: "k", models: { main: "m", fast: "f" }, label: "m", prices: { m: [1, 2] as [number, number] } };
  const echo = { name: "echo", description: "Echo text back", parameters: z.object({ text: z.string() }), run: async (a: unknown) => ({ echoed: (a as { text: string }).text }) };
  async function collect(gen: AsyncGenerator<unknown>) { const out = []; for await (const s of gen) out.push(s); return out; }

  it("runs a tool call, sends the result back, and ends with the final text", async () => {
    const srv = toolServer([{ calls: [{ name: "echo", args: "{\"text\":\"hi\"}" }] }, { content: "done" }]);
    const llm = createOpenAiCompatibleLlm(provider, srv.fetchImpl);
    const steps = await collect(llm.tools({ prompt: "go", tools: [echo] }));
    expect(steps).toEqual([
      { type: "call", id: "call_1", name: "echo", args: { text: "hi" } },
      { type: "result", id: "call_1", name: "echo", result: { echoed: "hi" } },
      { type: "final", text: "done" },
    ]);
    const sentTools = srv.calls[0].body.tools as { type: string; function: { name: string; parameters: { properties: object } } }[];
    expect(sentTools[0].function.name).toBe("echo");
    expect(sentTools[0].function.parameters.properties).toHaveProperty("text");
    const second = srv.calls[1].body.messages as { role: string; tool_call_id?: string; content?: string }[];
    expect(second.at(-1)).toEqual({ role: "tool", tool_call_id: "call_1", content: JSON.stringify({ echoed: "hi" }) });
    expect(llm.usage().inputTokens).toBe(20);
  });
  it("returns an error result for invalid JSON arguments and keeps going", async () => {
    const srv = toolServer([{ calls: [{ name: "echo", args: "{not json" }] }, { content: "ok" }]);
    const steps = await collect(createOpenAiCompatibleLlm(provider, srv.fetchImpl).tools({ prompt: "go", tools: [echo] }));
    expect(steps[1]).toMatchObject({ type: "result", result: { error: expect.stringMatching(/invalid arguments/) } });
    expect(steps.at(-1)).toEqual({ type: "final", text: "ok" });
  });
  it("returns an error result for arguments that fail the schema", async () => {
    const srv = toolServer([{ calls: [{ name: "echo", args: "{\"text\":5}" }] }, { content: "ok" }]);
    const steps = await collect(createOpenAiCompatibleLlm(provider, srv.fetchImpl).tools({ prompt: "go", tools: [echo] }));
    expect(steps[1]).toMatchObject({ type: "result", result: { error: expect.stringMatching(/invalid arguments/) } });
  });
  it("returns an error result for an unknown tool", async () => {
    const srv = toolServer([{ calls: [{ name: "nope", args: "{}" }] }, { content: "ok" }]);
    const steps = await collect(createOpenAiCompatibleLlm(provider, srv.fetchImpl).tools({ prompt: "go", tools: [echo] }));
    expect(steps[1]).toMatchObject({ type: "result", name: "nope", result: { error: "unknown tool nope" } });
  });
  it("returns an error result when a tool throws", async () => {
    const boom = { ...echo, run: async () => { throw new Error("db down"); } };
    const srv = toolServer([{ calls: [{ name: "echo", args: "{\"text\":\"x\"}" }] }, { content: "ok" }]);
    const steps = await collect(createOpenAiCompatibleLlm(provider, srv.fetchImpl).tools({ prompt: "go", tools: [boom] }));
    expect(steps[1]).toMatchObject({ result: { error: "db down" } });
  });
  it("stops after maxSteps even if the model keeps calling tools", async () => {
    const srv = toolServer([]);
    const steps = await collect(createOpenAiCompatibleLlm(provider, srv.fetchImpl).tools({ prompt: "go", tools: [echo], maxSteps: 3 }));
    expect(srv.calls).toHaveLength(3);
    expect(steps.at(-1)).toEqual({ type: "final", text: "(stopped after 3 steps)" });
  });
});
