import { test, expect } from "@playwright/test";
import { signedInAs, skipWithoutLiveSupabase } from "./helpers";
import { PERSONAS } from "./auth-state";
import { FIXTURE } from "./fixtures";

/**
 * The Library as an archive rather than a database.
 *
 * Entries used to show their whole record at once, which made a long
 * collection a wall and made every row shout equally. The index is now
 * the number, the spine and the title; the record opens where it sits.
 *
 * What this asserts is the behaviour, not the animation. Playwright
 * cannot see a view transition, and a test that waited for one would be
 * testing the browser. What matters to a member is that the detail is
 * genuinely absent until asked for, that asking reveals it in place
 * without navigating, and that the way into the Room is still reachable.
 */
test.describe("a Library record opens where it sits", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());
  // A finished record that nothing else in the suite writes to. The
  // first version of this ran as `expendable`, whose account the
  // deletion journey removes mid-run, so the record it was reading
  // vanished underneath it in a parallel pass.
  signedInAs(PERSONAS.archivist);

  test("the detail is absent until the record is opened, and never navigates", async ({ page }) => {
    await page.goto("/library");

    const record = page.getByRole("button", { name: new RegExp(FIXTURE.filmTitle, "i") });
    await expect(record).toBeVisible();

    // Shut. The member's own words are part of the record, not part of
    // the index, so the closed row does not render them.
    //
    // Asserted on visibility rather than on the page source. The words
    // are legitimately in the server payload — they are this member's
    // own writing, handed to their own client component — and a source
    // assertion here would be borrowing the spoiler suite's test for a
    // question that is about hierarchy, not secrecy.
    await expect(record).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText(/loud film, quiet drive home/i)).toHaveCount(0);

    await record.click();

    await expect(record).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/loud film, quiet drive home/i)).toBeVisible();
    // Opening a record is a change of state, not a destination. Nothing
    // has to find its way back because nothing went anywhere.
    await expect(page).toHaveURL(/\/library$/);

    await record.click();
    await expect(record).toHaveAttribute("aria-expanded", "false");
  });

  test("one record at a time, so the archive never becomes the wall again", async ({ page }) => {
    await page.goto("/library");

    const records = page.locator("li[data-open] > button[aria-expanded]");
    const count = await records.count();
    test.skip(count < 2, "Needs at least two records to prove they are exclusive.");

    await records.nth(0).click();
    await expect(records.nth(0)).toHaveAttribute("aria-expanded", "true");

    await records.nth(1).click();
    await expect(records.nth(1)).toHaveAttribute("aria-expanded", "true");
    await expect(records.nth(0)).toHaveAttribute("aria-expanded", "false");
  });
});
