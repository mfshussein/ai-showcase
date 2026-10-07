import { test, expect } from "@playwright/test";

test("the gallery is behind the gate", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/unlock\?next=%2F/);
});

test("a wrong code stays on unlock with an error", async ({ page }) => {
  await page.goto("/unlock");
  await page.fill("#password", "wrong");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/unlock\?error=1/);
  await expect(page.getByText("That code didn't work")).toBeVisible();
});

test("the viewer code opens the gallery without presenter tools", async ({ page }) => {
  await page.goto("/unlock?next=%2F");
  await page.fill("#password", "viewer-test");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL("/");
  await expect(page.getByText("Viewer")).toBeVisible();
  await expect(page.getByRole("link", { name: "Preflight" })).toHaveCount(0);
});

test("the presenter code shows presenter tools and the preflight page", async ({ page }) => {
  await page.goto("/unlock?next=%2F");
  await page.fill("#password", "presenter-test");
  await page.click("button[type=submit]");
  await expect(page.getByRole("link", { name: "Preflight" })).toBeVisible();
  await page.goto("/health");
  await expect(page.getByRole("heading", { name: "Preflight" })).toBeVisible();
  await expect(page.getByText("Anthropic API key missing")).toBeVisible();
});

test("live runs are refused for viewers", async ({ page }) => {
  await page.goto("/unlock?next=%2F");
  await page.fill("#password", "viewer-test");
  await page.click("button[type=submit]");
  const res = await page.request.get("/api/run/conflicting-docs");
  expect(res.status()).toBe(403);
});
