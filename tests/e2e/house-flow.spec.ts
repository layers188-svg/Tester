import { test, expect } from "@playwright/test";
import { signedInAs, skipWithoutLiveSupabase } from "./helpers";
import { PERSONAS } from "./auth-state";
import { FIXTURE } from "./fixtures";

/**
 * The House: what remains after the Opening.
 *
 * Tonight is an event. Once a member has revealed it, returning to the
 * same route should give them the aftermath rather than the finished
 * event on a loop.
 */
test.describe("the House after the Opening", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());
  // Revealed the fixture opening and touched nothing since, which is
  // the whole state under test. The friend persona also starts here but
  // the six-words journey marks it watched and publishes as friend, so
  // these assertions raced it.
  signedInAs(PERSONAS.returning);

  test("returning after the reveal opens the House, not the reveal card", async ({ page }) => {
    await page.goto("/tonight");

    // The Opening is still the largest object, and it is named.
    await expect(page.getByRole("heading", { name: FIXTURE.filmTitle })).toBeVisible();
    await expect(page.getByText(/now open/i)).toBeVisible();

    // The other sections of the House are present and in order.
    await expect(page.getByText("The Room", { exact: true })).toBeVisible();
    await expect(page.getByText(/find a film/i)).toBeVisible();
    await expect(page.getByText(/next opening/i)).toBeVisible();
  });

  /**
   * The rule the whole product turns on, asserted on the surface most
   * likely to break it: a homepage that wants something to show.
   */
  test("the Room on the House previews nothing before the member has spoken", async ({ page }) => {
    await page.goto("/tonight");

    await expect(page.getByText(/other voices wait until you have seen it/i)).toBeVisible();
    await expect(page.getByText(/from the house/i)).toHaveCount(0);

    // Nothing withheld may be present-but-hidden either: a blurred or
    // clipped quotation is still in the DOM and still readable.
    const html = await page.content();
    expect(html).not.toMatch(/loud film, quiet drive/i);
  });

  test("the hero offers one action, matched to where the member is", async ({ page }) => {
    await page.goto("/tonight");
    // Not yet watched, so the hero offers the way in and nothing else.
    // The apostrophe is the typographic one the copy actually renders;
    // matching on a straight quote finds nothing.
    await expect(page.getByRole("link", { name: /watch when you.re ready/i })).toBeVisible();
    // The Room is separately closed, so its own action is the only
    // other one on the page — and it is not "enter".
    await expect(page.getByRole("link", { name: /enter the room/i })).toHaveCount(0);
  });
});

test.describe("a member who has not revealed still gets the event", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());
  signedInAs(PERSONAS.member);

  test("Tonight stays sealed until this member opens it", async ({ page }) => {
    await page.goto("/tonight");
    await expect(page.getByText(/tonight is sealed/i)).toBeVisible();
    // The switch is per member, so the House must not leak the title to
    // someone who has not revealed it.
    expect(await page.content()).not.toMatch(new RegExp(FIXTURE.filmTitle, "i"));
  });
});

/**
 * Skipping, on a persona whose Tonight state nothing else asserts.
 *
 * The first version of this ran as `member` and revealed the fixture
 * opening, which is exactly the state the spoiler-regression and
 * tonight-flow journeys depend on staying sealed. Five tests failed
 * because of it. A journey that mutates a shared persona has to own
 * that persona.
 */
test.describe("six words can be skipped", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());
  signedInAs(PERSONAS.owner);

  test("skipping records nothing and still opens the Room", async ({ page }) => {
    await page.goto("/tonight");
    await page.getByRole("button", { name: /see tonight.s clue/i }).click();
    await page.getByRole("button", { name: /choose tonight.s film/i }).click({ timeout: 20_000 });
    await page.getByRole("button", { name: /mark watched/i }).click({ timeout: 20_000 });

    await expect(page.getByText(/six words after the picture/i)).toBeVisible();
    await page.getByRole("button", { name: /skip for now/i }).click();

    // The prompt goes and nothing is recorded: "did not feel like it
    // tonight" is not a fact worth storing about somebody.
    await expect(page.getByText(/six words after the picture/i)).toHaveCount(0);

    /*
     * And the Room opens anyway.
     *
     * This reverses the rule the product shipped with, by direction on
     * 14 August. What the old rule protected was never the writing — it
     * was the member's own reaction forming before outside opinion
     * reshaped it, and watching is when that happens. Publishing was
     * only the evidence, and demanding evidence made the Room a toll on
     * anybody who genuinely had nothing to say.
     *
     * The protection still stands where it stood: see the journey below,
     * where a member who has not watched is still turned away and still
     * gets no title on the way.
     */
    await page.goto(`/room/${FIXTURE.openingId}`);
    await expect(page).toHaveURL(/\/room\//);
    await expect(page.getByText(/see what stayed with everyone else/i)).toBeVisible();
  });
});
