import { test, expect, type Page } from "@playwright/test";
import { demos } from "../demos/registry";

const ready = demos.filter((d) => d.status === "ready");

async function unlock(page: Page) {
  await page.goto("/unlock?next=%2F");
  await page.fill("#password", "viewer-test");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");
}

test("walkthrough goes to the first recorded case, or home when none is recorded", async ({ page }) => {
  await unlock(page);
  await page.goto("/walkthrough");
  if (ready.length === 0) await expect(page).toHaveURL("/");
  else await expect(page).toHaveURL(`/demo/${ready[0].slug}?walk=1`);
});

for (const demo of ready) {
  test(`replay of ${demo.slug} reaches the end with a verdict and no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await unlock(page);
    await page.goto(`/demo/${demo.slug}`);
    await expect(page.getByRole("heading", { name: demo.title })).toBeVisible();
    let presses = 0;
    let sawVerdict = false;
    while (presses < 40 && (await page.getByRole("link", { name: "Back to all cases" }).count()) === 0) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(250);
      if ((await page.locator("[data-verdict]").count()) > 0) sawVerdict = true;
      presses++;
    }
    await expect(page.getByRole("link", { name: "Back to all cases" })).toBeVisible();
    expect(sawVerdict, "a verdict was shown during the walkthrough").toBe(true);
    expect(errors, errors.join("\n")).toEqual([]);
  });
}
