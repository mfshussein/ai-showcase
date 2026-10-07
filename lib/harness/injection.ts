/** Cheap first-pass prompt-injection heuristic. A model classifier runs after it in live mode. */
const RULES: [RegExp, number, string][] = [
  [/ignore (all |any )?(previous|prior|above|earlier) instructions/i, 0.6, "override"],
  [/(reveal|print|show|output|repeat).{0,40}(system prompt|instructions|hidden prompt)/i, 0.4, "exfiltrate-prompt"],
  [/you are now|pretend (to be|you are)|act as (an? )?(unrestricted|dan\b)/i, 0.4, "persona"],
  [/(salary|salaries|password|secret|credential).{0,30}(table|list|all|every|dump)/i, 0.2, "bulk-data"],
  [/base64|rot13|hex-?encode|translate .{0,20}into code/i, 0.2, "obfuscation"],
];

export function injectionHeuristic(text: string): { score: number; hits: string[] } {
  let score = 0;
  const hits: string[] = [];
  for (const [re, weight, name] of RULES) {
    if (re.test(text)) { score += weight; hits.push(name); }
  }
  return { score: Math.min(1, Math.round(score * 100) / 100), hits };
}
