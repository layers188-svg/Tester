import { test, expect } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers";

// Brief §17 items 1-2: "New email OTP sign in" and "Onboarding to
// Tonight." Fully automating this needs a way to read the six digit
// code that Supabase Auth emails out — there is no test inbox wired up
// in this environment. Once RESEND_API_KEY/a test mailbox exist, wire
// one in here (e.g. a Resend test-mode webhook, or Supabase's
// auth.admin API to read the OTP directly in a test-only branch) rather
// than reimplementing this test from scratch.
test.describe("email OTP sign in", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());

  test("requesting a code shows the six digit entry step", async ({ page }) => {
    await page.goto("/join");
    await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
    await page.getByRole("button", { name: /send my code/i }).click();
    await expect(page.getByLabel(/six digit code/i)).toBeVisible();
  });

  test("a new member lands on Tonight after verifying their code", async () => {
    // Requires TEST_OTP_EMAIL / TEST_OTP_CODE_SOURCE wiring — see the
    // module comment above.
    test.fixme(true, "Needs a live inbox or Supabase test-OTP bypass to read the code.");
  });
});
