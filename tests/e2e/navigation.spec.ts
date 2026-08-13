import { test, expect } from "@playwright/test";
import { signedInAs, skipWithoutLiveSupabase } from "./helpers";
import { PERSONAS } from "./auth-state";

// Brief §17 item 7: "Navigate Tonight, Circle, Library and You in both
// directions" — and brief §20 rule 14 ("check every route and all back
// navigation on a phone viewport").
test.describe("four-tab navigation, both directions", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());
  signedInAs(PERSONAS.member);

  test("every tab is reachable and back navigation returns to the previous tab", async ({
    page,
  }) => {
    await page.goto("/tonight");

    for (const tab of ["Circle", "Library", "You"]) {
      await page.getByRole("link", { name: tab }).click();
      await expect(page).toHaveURL(new RegExp(`/${tab.toLowerCase()}$`));
    }

    await page.goBack();
    await expect(page).toHaveURL(/\/library$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/circle$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/tonight$/);
  });

  test("all four tabs have a 44px minimum touch target", async ({ page }) => {
    await page.goto("/tonight");
    // Scoped to the primary nav on purpose. Unscoped, this matched the
    // masthead's link to /tonight as well as the tab, and failed on a
    // strict-mode violation that said nothing about touch targets. The
    // test is about the tab bar, so it should only ever look there.
    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const tab of ["Tonight", "Circle", "Library", "You"]) {
      const box = await nav.getByRole("link", { name: tab, exact: true }).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
