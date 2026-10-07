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

test("clicking Next with the mouse and then pressing Space advances exactly one beat", async ({ page }) => {
  test.skip(ready.length === 0, "needs a recorded case");
  await unlock(page);
  await page.goto(`/demo/${ready[0].slug}`);
  await page.waitForTimeout(500);
  const actLabel = () => page.locator("footer p").innerText();
  const before = await actLabel();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForTimeout(1500);
  const afterClick = await actLabel();
  await page.keyboard.press("Space");
  await page.waitForTimeout(1500);
  const afterSpace = await actLabel();
  // Act 1 -> click reaches act 2 -> Space reaches act 3 (never act 4).
  expect(before).toContain("Act 1 of");
  expect(afterClick).toContain("Act 2 of");
  expect(afterSpace).toContain("Act 3 of");
});

test("Cmd+L does not start a live run or move the stage", async ({ page }) => {
  test.skip(ready.length === 0, "needs a recorded case");
  await page.goto("/unlock?next=%2F");
  await page.fill("#password", "presenter-test");
  await page.click("button[type=submit]");
  await page.goto(`/demo/${ready[0].slug}`);
  await page.waitForTimeout(500);
  await page.keyboard.press("Meta+l");
  await page.keyboard.press("Meta+ArrowRight");
  await page.waitForTimeout(500);
  await expect(page.getByText("REPLAY", { exact: true })).toBeVisible();
  await expect(page.locator("footer p")).toContainText("Act 1 of");
});
