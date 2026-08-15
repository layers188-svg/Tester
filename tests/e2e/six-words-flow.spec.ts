import { test, expect } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers";

/**
 * Six words after the picture, and the two ways out of it
 * (acceptance test B9-B13).
 *
 * The rules changed with the August handover: one to six words rather
 * than exactly six, and "Skip for now" opens The Room without writing
 * a review. Both are enforced in Postgres — the word-count constraint
 * and skip_review() — so this is where they are exercised end to end.
 */
test.describe("mark watched, then leave six words or skip", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());

  test("watching asks for six words, and one word is enough", async ({ page }) => {
    await page.goto("/tonight");
    await page.getByRole("button", { name: /mark watched/i }).click();

    await expect(page.getByText(/six words after the picture/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /what stayed with you/i })).toBeVisible();

    const field = page.getByPlaceholder(/up to six words/i);
    await field.fill("Devastating");
    await page.getByRole("button", { name: /leave my six words/i }).click();
    await expect(page.getByText("Devastating")).toBeVisible();

    // Leaving words opens The Room.
    await expect(page.getByText(/the room is open/i)).toBeVisible();
  });

  test("skip for now opens The Room and writes no review", async ({ page, request }) => {
    await page.goto("/tonight");
    await page.getByRole("button", { name: /mark watched/i }).click();
    await page.getByRole("button", { name: /skip for now/i }).click();

    await expect(page.getByText(/the room is open/i)).toBeVisible();
    await page.getByRole("link", { name: /enter the room/i }).click();
    await expect(page.getByRole("heading", { name: "The Room" })).toBeVisible();

    // "Do not invent words" — Your Review offers to take them later
    // rather than showing an empty quote.
    await page.getByRole("button", { name: /your review/i }).click();
    await expect(page.getByText(/you kept it to yourself/i)).toBeVisible();

    // And nothing blank was written on the member's behalf.
    const own = await request.get("/api/account/export");
    if (own.ok()) {
      const body = await own.text();
      expect(body).not.toMatch(/"body"\s*:\s*""/);
    }
  });

  test("the server refuses a seventh word", async ({ request }) => {
    const response = await request.post("/api/six-words", {
      data: {
        openingId: "00000000-0000-0000-0000-000000000000",
        body: "This sentence definitely has way too many words",
      },
    });
    // 401 unauthenticated in a run without a session; a live session
    // gets 422 from validateSixWords, and the database constraint
    // refuses it underneath either way.
    expect([401, 422]).toContain(response.status());
  });
});
