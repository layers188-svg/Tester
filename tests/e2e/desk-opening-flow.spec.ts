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
    // One click, five sequential writes to a remote Supabase: the film,
    // the opening number lookup, the opening, the secret link and the
    // cues. Alone that takes a moment; with the rest of the suite on
    // the same project it exceeded the default five seconds and read as
    // a broken Desk rather than a slow one.
    await expect(page).toHaveURL(/\/desk\/openings\/[0-9a-f-]+/, { timeout: 20_000 });

    await page.setInputFiles('input[type="file"]', "tests/e2e/fixtures/sample-no-trailer.mp4");
    // The Desk names the stored object rather than announcing the act:
    // "Uploaded: <uuid>.mp4". The uuid is the point — brief §12 rule 6
    // requires the stored name to carry no meaning.
    // A real 10 MB file going to Supabase Storage, sometimes across an
    // ocean. The default five seconds is not enough and made this look
    // flaky rather than slow.
    await expect(page.getByText(/uploaded:\s*[0-9a-f-]{36}\.mp4/i)).toBeVisible({
      timeout: 60_000,
    });

    // Approving and scheduling each write to the remote project and
    // then re-render the page from it. Alone that is quick; sharing the
    // project with the rest of a parallel run it is not, and the
    // default five seconds reported a slow Desk as a broken one. Same
    // reasoning as the create assertion above.
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText(/approved: yes/i)).toBeVisible({ timeout: 20_000 });

    await page.getByLabel(/opens at/i).fill("2026-12-01T20:00");
    await page.getByRole("button", { name: /move to scheduled/i }).click();
    await expect(page.getByText(/status:\s*scheduled/i)).toBeVisible({ timeout: 20_000 });
  });
});
