import { defineConfig, devices } from "@playwright/test";

/**
 * Brief §17 "Playwright journeys". Journeys that need an authenticated
 * session and a live Supabase project are written here but skip
 * themselves (see tests/e2e/helpers.ts) when no such project is
 * configured — see LAUNCH_CHECKLIST.md. The public-site and PWA checks
 * always run.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        // Honour a pre-installed Chromium when one is provided (CI
        // images often ship one); otherwise Playwright resolves its
        // own download for the pinned version.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
