import { test, expect } from "@playwright/test";
import { signedInAs, skipWithoutLiveSupabase } from "./helpers";
import { PERSONAS } from "./auth-state";

// Brief §17 item 8: "Create and schedule an opening in the Programming
// Desk." Requires an owner-role session (ADMIN_EMAILS) and a real No
// Trailer file to upload.
test.describe("Programming Desk: create and schedule an opening", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());
  signedInAs(PERSONAS.owner);

  test("owner creates a draft, uploads a No Trailer, approves, and schedules it", async ({
    page,
  }) => {
    await page.goto("/desk/openings/new");
    await page.getByLabel(/film title/i).fill(`E2E Test Film ${Date.now()}`);
    await page.getByLabel(/runtime/i).fill("100");
    await page.getByRole("button", { name: /create opening/i }).click();
    await expect(page).toHaveURL(/\/desk\/openings\/[0-9a-f-]+/);

    await page.setInputFiles('input[type="file"]', "tests/e2e/fixtures/sample-no-trailer.mp4");
    // The Desk names the stored object rather than announcing the act:
    // "Uploaded: <uuid>.mp4". The uuid is the point — brief §12 rule 6
    // requires the stored name to carry no meaning.
    await expect(page.getByText(/uploaded:\s*[0-9a-f-]{36}\.mp4/i)).toBeVisible();

    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText(/approved: yes/i)).toBeVisible();

    await page.getByLabel(/opens at/i).fill("2026-12-01T20:00");
    await page.getByRole("button", { name: /move to scheduled/i }).click();
    await expect(page.getByText(/status:\s*scheduled/i)).toBeVisible();
  });
});
