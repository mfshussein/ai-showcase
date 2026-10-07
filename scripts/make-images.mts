/** Render demos/<slug>/fixtures/src/*.html to PNG. Usage: npm run images [slug]
 * Size comes from <meta name="size" content="1280x800">. Elements with data-tile="<id>" (and optional data-title)
 * are measured and written to fixtures/<name>.tiles.json as percent boxes, for snapping model callouts. */
import { chromium } from "@playwright/test";
import { readdir, mkdir, copyFile, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const only = process.argv[2];
const slugs = only ? [only] : (await readdir("demos", { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
const browser = await chromium.launch();
for (const slug of slugs) {
  const src = path.join("demos", slug, "fixtures", "src");
  if (!existsSync(src)) continue;
  const outDir = path.join("demos", slug, "fixtures");
  const pubDir = path.join("public", "fixtures", slug);
  await mkdir(pubDir, { recursive: true });
  for (const file of (await readdir(src)).filter((f) => f.endsWith(".html"))) {
    const name = file.replace(/\.html$/, "");
    const html = await readFile(path.join(src, file), "utf8");
    const m = /<meta name="size" content="(\d+)x(\d+)">/.exec(html);
    const [width, height] = m ? [Number(m[1]), Number(m[2])] : [1280, 800];
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto("file://" + path.resolve(src, file));
    await page.waitForLoadState("networkidle");
    await page.evaluate("document.fonts.ready");
    const png = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: png, fullPage: false });
    await copyFile(png, path.join(pubDir, `${name}.png`));
    // A string, not a function: tsx would inject a __name helper that does not exist in the page.
    const tiles = (await page.evaluate(`[...document.querySelectorAll("[data-tile]")].map((el) => {
      const r = el.getBoundingClientRect();
      const pct = (v, d) => Math.round((v / d) * 1000) / 10;
      return { id: el.getAttribute("data-tile"), title: el.getAttribute("data-title") || "", x: pct(r.x, ${width}), y: pct(r.y, ${height}), w: pct(r.width, ${width}), h: pct(r.height, ${height}) };
    })`)) as { id: string; title: string; x: number; y: number; w: number; h: number }[];
    // What is on screen, chart labels included: the source that quoted figures are traced against.
    const visible = (await page.evaluate(`(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) { const p = n.parentElement; if (p && !["SCRIPT", "STYLE"].includes(p.tagName) && n.textContent.trim()) out.push(n.textContent.trim()); } return out.join("\\n"); })()`)) as string;
    if (tiles.length) await writeFile(path.join(outDir, `${name}.text.txt`), visible + "\n");
    if (tiles.length) await writeFile(path.join(outDir, `${name}.tiles.json`), JSON.stringify({ width, height, tiles }, null, 2) + "\n");
    console.log(`${slug}/${name}.png ${width}x${height}${tiles.length ? `, ${tiles.length} tiles` : ""}`);
    await page.close();
  }
}
await browser.close();
