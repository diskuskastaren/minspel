import { defineConfig, devices } from "@playwright/test";

// E2E mot dev-servern (startas automatiskt om den inte redan kör).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  // Dev-servern kompilerar sidor vid första besöket, så ge lite marginal.
  expect: { timeout: 10_000 },
  fullyParallel: false,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "mobil", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
