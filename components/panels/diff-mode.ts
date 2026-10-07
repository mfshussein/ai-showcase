const words = (s: string) => new Set(s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 2));

/** A word diff is only readable when the two texts share most of their words; otherwise highlight the quoted phrases. */
export function diffMode(left: string, right: string): "words" | "highlight" {
  const a = words(left);
  const b = words(right);
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  const ratio = shared / Math.max(1, Math.min(a.size, b.size));
  return ratio >= 0.6 ? "words" : "highlight";
}
