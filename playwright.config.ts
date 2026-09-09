import { defineConfig, devices } from "@playwright/test";

// ponytail: specs share the dev.db (no per-run seed/reset), so workers must
// stay serial to avoid state races. Upgrade path: seed a disposable test DB
// per run if the suite grows past one smoke spec.
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  // Next dev-server compiles each route on first visit; the spec's
  // login -> dashboard -> group -> team chain can stack several first-hit
  // compiles inside one test, so the 30s default is too tight.
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      // Pixel 7, not iPhone: Playwright's iOS device presets default to
      // WebKit, and only the Chromium binary is installed here.
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
});
