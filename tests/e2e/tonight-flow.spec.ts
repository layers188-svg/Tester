import { test, expect } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers";

/**
 * The Tonight ritual, against a real signed-in session and the seeded
 * opening (supabase/seed.sql). Acceptance test B.
 *
 * Skipped until a live project exists, so this file's job is to state
 * the exact assertions that setup unlocks rather than to fake a pass.
 * The shape of the ritual is already proved against the real components
 * in motion.spec.ts, which runs everywhere; what only a live project
 * can prove is the half that lives in Postgres — that the title comes
 * from reveal_opening() and that the reveal is recorded.
 */
test.describe("Tonight: sealed, clue, No Trailer, black, reveal", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());

  test("the ritual runs in order and the title arrives only from the reveal", async ({ page }) => {
    await page.goto("/tonight");
    await expect(page.getByText(/tonight is sealed/i)).toBeVisible();

    // Nothing about the film is in the page before the reveal.
    expect(await page.content()).not.toMatch(/whiplash/i);

    // The clue opens on a deliberate press and hold.
    const seal = page.getByRole("button", { name: /tonight is sealed/i });
    const box = (await seal.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
    await expect(page.getByText(/that is the whole clue/i)).toBeVisible();

    // The clue frame becomes the picture. No autoplay.
    await page.getByRole("button", { name: /^continue$/i }).click();
    await expect(page.getByRole("button", { name: /^play$/i })).toBeVisible();
    expect(await page.content()).not.toMatch(/whiplash/i);

    await page.getByRole("button", { name: /^play$/i }).click();

    // There is no way past the picture: the title appears on its own,
    // after the media ends and the server has recorded the reveal.
    await expect(page.getByRole("heading", { name: /whiplash/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("link", { name: /example streaming/i })).toBeVisible();

    // A refresh keeps the reveal — it is server state, not a flag in
    // this tab (acceptance test B14).
    await page.reload();
    await expect(page.getByRole("heading", { name: /whiplash/i })).toBeVisible();
  });

  test("a member who has not revealed cannot get the title from the reveal route", async ({
    request,
  }) => {
    const response = await request.post("/api/reveal/opening/00000000-0000-0000-0000-000000000000");
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(await response.text()).not.toMatch(/whiplash/i);
  });
});
