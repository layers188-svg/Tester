import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { signedInAs, skipWithoutLiveSupabase } from "./helpers";
import { PERSONAS } from "./auth-state";

/**
 * Captures the product as it actually runs, for showing progress.
 *
 * Not a test — it asserts almost nothing. It exists because there is no
 * deployed URL yet, so the only honest way to show what the app looks
 * like is to photograph the real one: production build, real Supabase,
 * real session, at the 390px phone width the brief designs for.
 *
 * Off unless CAPTURE=1, so it never runs as part of a normal suite.
 * It leans on the same global setup and teardown as the journeys, so
 * the accounts and fixtures it needs are created and removed with them.
 */
const CAPTURE_DIR = path.join(process.cwd(), "capture");

test.describe("capture", () => {
  test.skip(process.env.CAPTURE !== "1", "Set CAPTURE=1 to take screenshots.");
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeAll(() => {
    fs.mkdirSync(CAPTURE_DIR, { recursive: true });
  });

  async function shot(page: import("@playwright/test").Page, name: string) {
    await page.screenshot({
      path: path.join(CAPTURE_DIR, `${name}.jpg`),
      type: "jpeg",
      quality: 82,
      fullPage: true,
    });
  }

  test("public pages", async ({ page }) => {
    for (const [name, url] of [
      ["01-home", "/"],
      ["02-how-it-works", "/how-it-works"],
      ["03-join", "/join"],
    ] as const) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await shot(page, name);
    }
  });

  test.describe("signed in", () => {
    test.beforeEach(() => skipWithoutLiveSupabase());
    signedInAs(PERSONAS.member);

    test("the member's four tabs, sealed", async ({ page }) => {
      await page.goto("/tonight");
      await expect(page.getByText(/tonight is sealed/i)).toBeVisible();
      await shot(page, "04-tonight-sealed");

      // Mid-ritual: the No Trailer playing, before any title exists.
      await page.getByRole("button", { name: /dim the house/i }).click();
      await page.waitForTimeout(1200);
      await shot(page, "05-no-trailer");

      for (const [name, url] of [
        ["07-circle", "/circle"],
        ["08-library", "/library"],
        ["09-you", "/you"],
      ] as const) {
        await page.goto(url);
        await page.waitForLoadState("networkidle");
        await shot(page, name);
      }
    });
  });

  test.describe("after the reveal", () => {
    test.beforeEach(() => skipWithoutLiveSupabase());
    signedInAs(PERSONAS.friend);

    test("revealed Tonight", async ({ page }) => {
      await page.goto("/tonight");
      await page.waitForLoadState("networkidle");
      await shot(page, "06-revealed");
    });
  });

  test.describe("the Programming Desk", () => {
    test.beforeEach(() => skipWithoutLiveSupabase());
    signedInAs(PERSONAS.owner);
    test.use({ viewport: { width: 900, height: 1000 } });

    test("desk screens", async ({ page }) => {
      for (const [name, url] of [
        ["10-desk-openings", "/desk/openings"],
        ["11-desk-analytics", "/desk/analytics"],
      ] as const) {
        await page.goto(url);
        await page.waitForLoadState("networkidle");
        await shot(page, name);
      }
    });
  });
});
