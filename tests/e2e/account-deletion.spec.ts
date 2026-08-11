import { test, expect } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers";

// Brief §17 item 9: "Delete review and account."
test.describe("delete review and account", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());

  test("member deletes their own six-word review", async ({ page }) => {
    await page.goto("/tonight");
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByPlaceholder("Six words, exactly.")).toBeVisible();
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
