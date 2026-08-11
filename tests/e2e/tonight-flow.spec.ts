import { test, expect } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers";

// Brief §17 item 3: "Dim, play No Trailer, reveal and open provider
// handoff." Requires a signed-in session and the seeded Whiplash
// opening (supabase/seed.sql) to be open. Storage state for an
// authenticated member should be prepared by a global setup once a
// live project exists (see LAUNCH_CHECKLIST.md) — this file documents
// the exact assertions that setup should unlock rather than faking a
// pass today.
test.describe("Tonight: dim, play, reveal, provider handoff", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());

  test("sealed opening dims, plays the No Trailer, and reveals on demand", async ({ page }) => {
    await page.goto("/tonight");
    await expect(page.getByText(/tonight is sealed/i)).toBeVisible();

    const html = await page.content();
    expect(html).not.toMatch(/whiplash/i);

    await page.getByRole("button", { name: /dim the house/i }).click();
    await expect(page.locator("video")).toBeVisible();

    await page.getByRole("button", { name: /reveal the title/i }).click();
    await expect(page.getByRole("heading", { name: /whiplash/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /example streaming service/i })).toBeVisible();
  });
});
