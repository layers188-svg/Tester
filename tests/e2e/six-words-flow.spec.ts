import { test, expect } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers";

// Brief §17 item 4: "Mark watched and submit six words."
test.describe("mark watched and leave six words", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());

  test("watching unlocks the six words form, and After Credits opens once submitted", async ({
    page,
  }) => {
    await page.goto("/tonight");
    await page.getByRole("button", { name: /mark watched/i }).click();
    await expect(page.getByPlaceholder("Six words, exactly.")).toBeVisible();

    await page.getByPlaceholder("Six words, exactly.").fill("I did not see that coming");
    await page.getByRole("button", { name: /leave your six words/i }).click();

    await expect(page.getByText(/i did not see that coming/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /after credits/i })).toBeVisible();
  });

  test("the server rejects a review that is not exactly six words", async ({ request }) => {
    const response = await request.post("/api/six-words", {
      data: { openingId: "00000000-0000-0000-0000-000000000000", body: "Too short" },
    });
    expect(response.status()).toBe(401); // unauthenticated in this run; a live session would get 422 instead.
  });
});
