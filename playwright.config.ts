import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// Browser tests run against the Neon "test" branch only (connection strings in .env.test,
// created with `neon env pull --branch test --file .env.test`). They create accounts and
// events, so they must never point at dev or production data.
const testEnv = loadEnv({ path: ".env.test", override: true }).parsed ?? {};
if (testEnv.NEON_BRANCH !== "test") {
  throw new Error("e2e tests need .env.test for the Neon `test` branch. Run: neon env pull --branch test --file .env.test");
}

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Tests share one database, so run them one at a time.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Uses the installed Microsoft Edge, so no browser download is needed.
    // Set PW_CHANNEL=chromium (after `npx playwright install chromium`) e.g. for CI.
    channel: process.env.PW_CHANNEL ?? "msedge",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Edge"], channel: process.env.PW_CHANNEL ?? "msedge" } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: false,
    // Separate build folder so a running `npm run dev` (.next) is never disturbed.
    env: { ...testEnv, NEXT_DIST_DIR: ".next-test" },
    stdout: "ignore",
    stderr: "pipe",
  },
});
