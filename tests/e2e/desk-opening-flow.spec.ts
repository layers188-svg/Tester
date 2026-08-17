import { test, expect } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers";

// Brief §17 item 8: "Create and schedule an opening in the Programming
// Desk." Requires an owner-role session (ADMIN_EMAILS) and a real No
// Trailer file to upload.
test.describe("Programming Desk: create and schedule an opening", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());

  test("owner creates a draft, uploads a No Trailer, approves, and schedules it", async ({
    page,
  }) => {
    await page.goto("/desk/openings/new");
    await page.getByLabel(/film title/i).fill(`E2E Test Film ${Date.now()}`);
    await page.getByLabel(/runtime/i).fill("100");
    await page.getByRole("button", { name: /create opening/i }).click();
    await expect(page).toHaveURL(/\/desk\/openings\/[0-9a-f-]+/);

    await page.setInputFiles('input[type="file"]', "media/no-trailer/HDNT-006.mp4");
    await expect(page.getByText(/no trailer uploaded/i)).toBeVisible();

    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText(/approved: yes/i)).toBeVisible();

    await page.getByLabel(/opens at/i).fill("2026-12-01T20:00");
    await page.getByRole("button", { name: /move to scheduled/i }).click();
    await expect(page.getByText(/status:\s*scheduled/i)).toBeVisible();
  });
});
