/** Dev tool: screenshot a page behind the gate. Usage: npx tsx scripts/shot.mts <path> <out.png> [presses] [--presenter] [port] */
import { chromium } from "@playwright/test";
const [, , path = "/", out = "shot.png", pressesArg = "0", ...rest] = process.argv;
const presenter = rest.includes("--presenter");
const port = rest.find((r) => /^\d+$/.test(r)) ?? "3999";
const base = `http://localhost:${port}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors: string[] = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(`${base}/unlock`);
await page.fill("#password", presenter ? (process.env.PRESENTER_PASSWORD ?? "p") : (process.env.VIEWER_PASSWORD ?? "v"));
await page.click("button[type=submit]");
await page.goto(`${base}${path}`);
await page.waitForTimeout(800);
for (let i = 0; i < Number(pressesArg); i++) { await page.keyboard.press("Space"); await page.waitForTimeout(1200); }
await page.screenshot({ path: out, fullPage: false });
console.log(`wrote ${out}; console errors: ${errors.length}`); for (const e of errors) console.log("  " + e);
await browser.close();
