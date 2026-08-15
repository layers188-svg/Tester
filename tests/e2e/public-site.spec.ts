import { test, expect } from "@playwright/test";

const PUBLIC_PAGES = [
  // The brand line, which is now the entrance headline rather than an
  // argument against trailers and reviews. An offer rather than an
  // instruction since 15 August.
  { path: "/", heading: /get the excitement of not knowing back/i },
  { path: "/how-it-works", heading: /how it works/i },
  { path: "/join", heading: /join or sign in/i },
  { path: "/terms", heading: /terms/i },
  { path: "/privacy", heading: /privacy/i },
  { path: "/film-rights", heading: /film rights/i },
];

// The seeded, protected title (brief §17 "Spoiler regression test", §18).
const FORBIDDEN_TITLE = "Whiplash";

test.describe("public site — mobile viewport", () => {
  for (const { path, heading } of PUBLIC_PAGES) {
    test(`${path} renders and carries no forbidden title`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);

      const html = await page.content();
      expect(html).not.toMatch(new RegExp(FORBIDDEN_TITLE, "i"));
    });
  }

  test("primary navigation reaches Join and back to Home", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in" }).first().click();
    await expect(page).toHaveURL(/\/join/);
    await page.goBack();
    await expect(page).toHaveURL("/");
  });

  test("footer legal links work from Home", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Terms" }).click();
    await expect(page).toHaveURL(/\/terms/);
    await page.goBack();
    await expect(page).toHaveURL("/");
  });

  test("an unknown URL gets the house's own 404, not the framework's", async ({ page }) => {
    // Brief §16 resilience rule 1. The same page serves every
    // notFound() — a Circle you left, a recommendation that was never
    // yours — so it must not distinguish "missing" from "not yours".
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /nothing here/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /go to tonight/i })).toBeVisible();
  });

  test("Join page explains the code flow without collecting a password", async ({ page }) => {
    await page.goto("/join");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel(/password/i)).toHaveCount(0);
    await expect(page.getByText(/expires in 5 minutes/i)).toBeVisible();
  });
});

test.describe("signed-in routes redirect when unauthenticated", () => {
  // The (app) layout redirects to a bare /join (a Server Component
  // cannot read the request pathname); /desk knows its own path and
  // keeps the ?next=. Either way, nothing renders for an anonymous
  // visitor.
  for (const path of ["/tonight", "/circle", "/library", "/you"]) {
    test(`${path} redirects to /join`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/join$/);
    });
  }

  test("/desk redirects to /join and keeps its destination", async ({ page }) => {
    await page.goto("/desk");
    await expect(page).toHaveURL(/\/join\?next=\/desk$/);
  });
});

/**
 * No em or en dashes in anything a member reads.
 *
 * The house rule is about interface copy, so this tests rendered text
 * rather than source: comments and docs are explicitly unaffected, and
 * a grep over the repository would fail on both while missing anything
 * a component builds at runtime.
 *
 * Visible text and the accessibility tree only. A dash inside a URL,
 * a class name or a data attribute is not something anybody reads.
 */
test.describe("no em or en dashes in rendered copy", () => {
  for (const { path } of PUBLIC_PAGES) {
    test(`${path} recasts rather than punctuates`, async ({ page }) => {
      await page.goto(path);

      const visibleText = await page.evaluate(() => document.body.innerText);
      const labels = await page.evaluate(() =>
        [...document.querySelectorAll("[aria-label],[alt],[title]")]
          .flatMap((el) => [
            el.getAttribute("aria-label"),
            el.getAttribute("alt"),
            el.getAttribute("title"),
          ])
          .filter((value): value is string => Boolean(value))
          .join(" "),
      );
      const documentTitle = await page.title();
      const metaDescription = await page
        .locator('meta[name="description"]')
        .getAttribute("content");

      const read = [visibleText, labels, documentTitle, metaDescription ?? ""].join(" ");

      // Reported together: fixing one dash and rerunning to find the
      // next is how a sweep gets abandoned half done.
      const offenders = [...read].filter((character) => character === "—" || character === "–");
      expect(
        offenders,
        `found ${offenders.length} em/en dash(es) in rendered copy on ${path}`,
      ).toEqual([]);
    });
  }
});
