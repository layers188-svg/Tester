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
  // Mints a real session per persona when a live project is configured,
  // and returns immediately when one is not — so the public suite runs
  // unchanged with no Supabase at all. See tests/e2e/global-setup.ts.
  globalSetup: "./tests/e2e/global-setup.ts",
  // Removes the accounts and content the setup created, and fails the
  // run if anything survives. See tests/e2e/global-teardown.ts.
  globalTeardown: "./tests/e2e/global-teardown.ts",
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
  // Built output, not `next dev`.
  //
  // Turbopack's dev server panics while compiling /api/six-words — an
  // internal turbo-tasks assertion in aggregation_update.rs, nothing to
  // do with this code — and takes the server down mid-request. The
  // journey that submits six words hung on "Saving…" until it timed
  // out, which read exactly like an application bug and was not one.
  // The production build compiles it without complaint, and is closer
  // to what a member actually gets.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npx next start -p 3100",
        url: "http://localhost:3100",
        reuseExistingServer: true,
        timeout: 300_000,
      },
});
