import fs from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";
import { signedInAs, skipWithoutLiveSupabase } from "./helpers";
import { PERSONAS } from "./auth-state";
import { FIXTURE } from "./fixtures";

/**
 * Photographs the transitions while they are running.
 *
 * Every motion pass so far has been reported on without anybody having
 * seen it. Playwright cannot assert that a view transition happened —
 * there is no API for it and no meaningful DOM state to read — but
 * Chromium here does run them, and a screenshot taken mid-transition
 * catches the ::view-transition pseudo-elements in whatever position
 * they have reached. A strip of those is the closest thing to watching
 * the thing move, and it is enough to answer the only question that
 * matters: does the object survive, or does it fade out and a similar
 * one fade in somewhere else?
 *
 * `animations: "allow"` is what makes this work. Playwright's default
 * is to freeze animations before taking a screenshot, which would
 * photograph every frame at its resting state and prove nothing.
 *
 * Off unless MOTION_CAPTURE=1. It asserts nothing and is not a test; it
 * produces evidence for a person to look at.
 */
const DIR = path.join(process.cwd(), "capture", "motion");

test.describe("motion capture", () => {
  test.skip(process.env.MOTION_CAPTURE !== "1", "Set MOTION_CAPTURE=1 to film the transitions.");
  test.use({ viewport: { width: 390, height: 844 } });
  test.setTimeout(180_000);

  test.beforeAll(() => {
    fs.mkdirSync(DIR, { recursive: true });
  });

  /** A strip of frames while something is moving. */
  async function film(
    page: import("@playwright/test").Page,
    name: string,
    frames: number,
    everyMs: number,
  ) {
    for (let i = 0; i < frames; i += 1) {
      await page.screenshot({
        path: path.join(DIR, `${name}-${String(i).padStart(2, "0")}.jpg`),
        type: "jpeg",
        quality: 70,
        animations: "allow",
      });
      await page.waitForTimeout(everyMs);
    }
  }

  test.describe("the opening sequence", () => {
    test.beforeEach(() => skipWithoutLiveSupabase());
    signedInAs(PERSONAS.member);

    test("sealed to clue to no trailer to reveal", async ({ page }) => {
      await page.goto("/tonight");
      await page.waitForTimeout(1500);

      // 1-2. DIM, then the clue frame growing into the playback stage.
      // The frame is `hd-clue-frame` on both sides, so what these frames
      // should show is one rectangle getting larger, not a card fading
      // while a black screen fades in over it.
      await page.getByRole("button", { name: /see tonight.s clue/i }).click();
      await film(page, "01-sealed-to-clue", 14, 90);

      // 3-4. The film runs, ends into black, holds, and the title
      // arrives under a rule that was already there.
      await page.waitForTimeout(4000);
      await film(page, "02-trailer-to-reveal", 16, 400);
    });
  });

  test.describe("the response sequence", () => {
    test.beforeEach(() => skipWithoutLiveSupabase());
    signedInAs(PERSONAS.friend);

    test("mark watched, six words, and the room opening", async ({ page }) => {
      await page.goto(`/opening/${FIXTURE.openingId}`);
      await page.waitForTimeout(1200);

      // 5. The title reduces and the utility leaves from under it.
      await page.getByRole("button", { name: /mark watched/i }).click();
      await film(page, "03-watched-to-six-words", 10, 90);

      await page.getByLabel("Your six words").fill("Loud film, quiet drive home");
      await page.getByRole("button", { name: /leave my six words/i }).click();

      // 6. The submission moment: words settle, rule draws, hold.
      await film(page, "04-submission-moment", 14, 220);

      // 7. Entering the Room, where the same words should arrive at the
      // top rather than being drawn again.
      await page.getByRole("link", { name: /enter the room/i }).click();
      await film(page, "05-six-words-to-room", 12, 120);
    });
  });

  test.describe("search", () => {
    test.beforeEach(() => skipWithoutLiveSupabase());
    signedInAs(PERSONAS.archivist);

    test("choosing a result", async ({ page }) => {
      await page.goto("/search");
      await page.getByLabel(/search any film/i).fill("whiplash");
      await page.waitForTimeout(1200);

      // 8. The chosen row travels into the heading while the others
      // fold upward.
      await page
        .getByRole("button", { name: /whiplash/i })
        .first()
        .click();
      await film(page, "06-search-selection", 12, 110);
    });
  });
});
