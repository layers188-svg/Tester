import { test, expect } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers";

// Brief §17 item 7: "Navigate Tonight, Circle, Library and You in both
// directions" — and brief §20 rule 14 ("check every route and all back
// navigation on a phone viewport").
test.describe("four-tab navigation, both directions", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());

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
    for (const tab of ["Tonight", "Circle", "Library", "You"]) {
      const box = await page.getByRole("link", { name: tab }).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
