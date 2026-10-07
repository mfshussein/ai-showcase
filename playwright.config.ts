import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  retries: 0,
  use: { baseURL: "http://localhost:3998", viewport: { width: 1440, height: 900 } },
  webServer: {
    command: "npx next dev -p 3998",
    port: 3998,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VIEWER_PASSWORD: "viewer-test", PRESENTER_PASSWORD: "presenter-test", COOKIE_SECRET: "e2e-secret", ANTHROPIC_API_KEY: "" },
  },
});
