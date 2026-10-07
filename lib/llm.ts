/** Placeholder until Task 8 replaces it with the Anthropic-backed implementation. */
export interface Llm {
  usage(): { inputTokens: number; outputTokens: number; costUsd: number };
}
