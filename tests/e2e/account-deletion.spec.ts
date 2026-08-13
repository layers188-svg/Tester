import { test, expect } from "@playwright/test";
import { signedInAs, skipWithoutLiveSupabase } from "./helpers";
import { PERSONAS } from "./auth-state";

// Brief §17 item 9: "Delete review and account."
test.describe("delete review and account", () => {
  // These two are genuinely ordered, not merely grouped: the second one
  // deletes the expendable persona's account, and the first needs that
  // account signed in with its seeded six-word review still present.
  // Under the config's `fullyParallel` they raced, and the review test
  // failed with "waiting for getByRole('button', { name: 'Delete' })" —
  // the account had already been deleted underneath it, so /tonight had
  // bounced to /join. It passed or failed on worker scheduling alone,
  // which is the worst kind of test. Serial mode pins the order.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => skipWithoutLiveSupabase());
  signedInAs(PERSONAS.expendable);

  test("member deletes their own six-word review", async ({ page }) => {
    await page.goto("/tonight");
    await page.getByRole("button", { name: "Delete" }).click();
    // Deleting returns the member to the empty field, ready to write
    // again. Asserted on the heading rather than on the field's
    // placeholder, which the six-slot input does not have.
    await expect(page.getByText(/six words after the picture/i)).toBeVisible();
    await expect(page.getByLabel("Your six words")).toHaveValue("");
  });

  test("member deletes their account from You", async ({ page }) => {
    await page.goto("/you");
    await page.getByRole("button", { name: /delete account and all content/i }).click();
    await page.getByRole("button", { name: /yes, delete everything/i }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/tonight");
    await expect(page).toHaveURL(/\/join/);
  });
});
