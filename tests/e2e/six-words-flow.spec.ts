import { test, expect } from "@playwright/test";
import { signedInAs, skipWithoutLiveSupabase } from "./helpers";
import { PERSONAS } from "./auth-state";

// Brief §17 item 4: "Mark watched and submit six words."
test.describe("mark watched and leave six words", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());
  // Runs as the friend, who has revealed. The member stays sealed for
  // Tonight and the spoiler journey.
  signedInAs(PERSONAS.friend);

  test("watching unlocks the six words form, and After Credits opens once submitted", async ({
    page,
  }) => {
    await page.goto("/tonight");
    await page.getByRole("button", { name: /mark watched/i }).click();
    await expect(page.getByPlaceholder("Exactly six words")).toBeVisible();

    await page.getByPlaceholder("Exactly six words").fill("I did not see that coming");
    await page.getByRole("button", { name: /publish six words/i }).click();

    await expect(page.getByText(/i did not see that coming/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /after credits/i })).toBeVisible();
  });

  test("the server rejects a review that is not exactly six words", async ({ request }) => {
    const response = await request.post("/api/six-words", {
      data: { openingId: "00000000-0000-0000-0000-000000000000", body: "Too short" },
    });
    // 422, not 401: there is a session now, so the request gets as far
    // as the six-word rule and is refused on its merits. The comment
    // this replaces predicted exactly that.
    expect(response.status()).toBe(422);
    // The copy counts up rather than restating the rule: "4 more
    // words needed." Better wording than the assertion I first wrote.
    expect((await response.json()).error).toMatch(/more words? needed/i);
  });
});
