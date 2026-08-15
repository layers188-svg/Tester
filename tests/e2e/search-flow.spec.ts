import { test, expect } from "@playwright/test";
import { signedInAs, skipWithoutLiveSupabase } from "./helpers";
import { PERSONAS } from "./auth-state";

/**
 * Search: you choose, without spoiling it.
 *
 * The assertions that matter here are the negative ones. It is easy to
 * build a search that works and quietly shows a poster, a rating or a
 * line of plot on the way past, and any one of those undoes the reason
 * the feature exists.
 */
test.describe("spoiler-free search", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());
  signedInAs(PERSONAS.member);

  test("a member searches, disambiguates by year, and gets six words", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: /find a film/i })).toBeVisible();
    await expect(page.getByText(/know enough to choose\. nothing more\./i)).toBeVisible();

    await page.getByLabel(/search any film/i).fill("whiplash");

    // Two films share the name. Year is the only thing offered to tell
    // them apart, and it has to be enough.
    const results = page.getByRole("listitem");
    await expect(results.filter({ hasText: "Whiplash" })).toHaveCount(2);
    await expect(page.getByText("2014")).toBeVisible();
    await expect(page.getByText("2002")).toBeVisible();

    await page.getByRole("button", { name: /whiplash 2014/i }).click();

    await expect(page.getByText(/six words before the picture/i)).toBeVisible();
    await expect(page.getByText("Drummer chases greatness under brutal mentorship.")).toBeVisible();

    // Exactly six words, counted from what actually rendered.
    const premise = await page
      .getByText("Drummer chases greatness under brutal mentorship.")
      .textContent();
    expect(premise?.trim().split(/\s+/)).toHaveLength(6);

    await expect(page.getByText("Ambition")).toBeVisible();
    await expect(page.getByText("Relentless")).toBeVisible();
  });

  test("nothing on the page is a poster, a rating or a synopsis", async ({ page }) => {
    await page.goto("/search");
    await page.getByLabel(/search any film/i).fill("parasite");
    await page
      .getByRole("button", { name: /parasite/i })
      .first()
      .click();
    await expect(page.getByText(/struggling family/i)).toBeVisible();

    // No imagery at all beyond House Dark's own marks: the copyright
    // rule forbids posters and stills, and there is nothing else a film
    // page would want an <img> for.
    const externalImages = await page.locator("main img").count();
    expect(externalImages).toBe(0);

    // The source synopsis exists on the server and must never arrive.
    const html = await page.content();
    expect(html).not.toMatch(/semi-basement/i);
    expect(html).not.toMatch(/\b\d(\.\d)?\s*\/\s*10\b/);
  });

  test("search reaches the field from the navigation and back again", async ({ page }) => {
    await page.goto("/tonight");
    await page.getByRole("link", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search$/);

    await page.getByLabel(/search any film/i).fill("burning");
    await page
      .getByRole("button", { name: /burning/i })
      .first()
      .click();
    await expect(page.getByText(/young man searches/i)).toBeVisible();

    // Reversible, and without a route change: the film recedes and the
    // field comes back on the same page.
    await page.getByRole("button", { name: /search again/i }).click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.getByRole("heading", { name: /find a film/i })).toBeVisible();
  });

  test("save for later lands in the existing Library, not a second list", async ({ page }) => {
    await page.goto("/search");
    await page.getByLabel(/search any film/i).fill("florida");
    await page
      .getByRole("button", { name: /florida project/i })
      .first()
      .click();

    await page.getByRole("button", { name: /save for later/i }).click();
    await expect(page.getByRole("button", { name: /^saved$/i })).toBeVisible();

    await page.goto("/library");
    await expect(page.getByText("The Florida Project")).toBeVisible();
  });

  test("a film with nothing behind the name says so in the house's voice", async ({ page }) => {
    await page.goto("/search");
    await page.getByLabel(/search any film/i).fill("zzzz not a film");
    await expect(page.getByText(/nothing under that name/i)).toBeVisible();
  });

  /**
   * Search spends the house's metadata and editorial quota, so it is
   * signed-in only.
   *
   * `storageState: undefined` is load-bearing: a context created inside
   * this describe inherits the persona from `signedInAs`, so without it
   * this asserts that a signed-in member is signed in.
   */
  test("the autocomplete refuses an unauthenticated caller", async ({ browser }) => {
    const anonymous = await browser.newContext({ storageState: undefined });
    const response = await anonymous.request.get("/api/search/films?q=whiplash");
    expect(response.status()).toBe(401);
    await anonymous.close();
  });
});
