import { test, expect } from "@playwright/test";

const PUBLIC_PAGES = [
  { path: "/", heading: /best film experiences/i },
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
