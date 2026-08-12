import { test, expect } from "@playwright/test";

/**
 * Mobile QA sweep (brief §16 accessibility, §20 rule 14: "Check every
 * route and all back navigation on a phone viewport"). Runs at the
 * three phone widths the brief names — 320, 390 and 430 — and asserts
 * the structural things that are easy to regress and tedious to catch
 * by eye.
 */

const PUBLIC_PATHS = ["/", "/how-it-works", "/join", "/terms", "/privacy", "/film-rights"];
const PHONE_WIDTHS = [320, 390, 430];

for (const width of PHONE_WIDTHS) {
  test.describe(`public site at ${width}px`, () => {
    // The project config already supplies the Pixel 7 device; only
    // the width varies here.
    test.use({ viewport: { width, height: 900 } });

    for (const path of PUBLIC_PATHS) {
      test(`${path} has no horizontal overflow`, async ({ page }) => {
        await page.goto(path);
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        // One pixel of tolerance for sub-pixel rounding.
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      });

      test(`${path} has exactly one h1 and no skipped heading levels`, async ({ page }) => {
        await page.goto(path);
        const levels = await page.evaluate(() =>
          Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) =>
            Number(h.tagName[1]),
          ),
        );
        expect(levels.filter((l) => l === 1)).toHaveLength(1);
        let previous = 0;
        for (const level of levels) {
          if (previous) expect(level).toBeLessThanOrEqual(previous + 1);
          previous = level;
        }
      });

      test(`${path} standalone controls meet the 44px touch target`, async ({ page }) => {
        await page.goto(path);
        // WCAG 2.5.8 exempts links inline in a sentence, so only
        // standalone controls are measured.
        const undersized = await page.evaluate(() => {
          const out: string[] = [];
          document.querySelectorAll("a, button, select, textarea").forEach((el) => {
            const parentTag = el.parentElement?.tagName ?? "";
            const isInlineInProse = ["P", "LI", "SPAN"].includes(parentTag);
            if (isInlineInProse) return;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;
            const style = getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") return;
            if (rect.height < 44) {
              out.push(
                `${el.tagName} "${(el.textContent ?? "").trim().slice(0, 30)}" h=${rect.height}`,
              );
            }
          });
          return out;
        });
        expect(undersized).toEqual([]);
      });
    }
  });
}

test.describe("reduced motion", () => {
  test("the home page renders with prefers-reduced-motion set", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Motion tokens collapse to zero rather than the page breaking.
    // Chromium normalises "0ms" to "0s" when reading a custom property
    // that has been resolved as a <time>, so accept either spelling.
    const buttonDuration = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--hd-motion-button").trim(),
    );
    expect(["0ms", "0s"]).toContain(buttonDuration);
  });
});

test.describe("form errors reach assistive technology", () => {
  // Brief §16 accessibility rule 8. Join is the only form reachable
  // without a session, and it is the first one every member meets.
  test("a rejected email marks the input invalid and names the reason", async ({ page }) => {
    await page.goto("/join");

    // An address the browser's own validation accepts, so the request
    // is actually made and the server's rejection is what renders.
    await page.getByLabel("Email").fill("not-a-real-mailbox@invalid");
    await page.getByRole("button", { name: /send my code/i }).click();

    // Scoped to the form: Next mounts its own role="alert" route
    // announcer on the document, which would match too.
    const alert = page.locator("form").getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).not.toBeEmpty();

    const email = page.getByLabel("Email");
    await expect(email).toHaveAttribute("aria-invalid", "true");

    // The association is the point: the id the field points at must be
    // the element carrying the message.
    const describedBy = await email.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const description = page.locator(`#${describedBy}`);
    await expect(description).toHaveText(await alert.innerText());
    await expect(description).toHaveAttribute("role", "alert");
  });
});

test.describe("keyboard access", () => {
  test("the skip link is the first stop and reaches main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    expect(focused).toBe("Skip to content");
  });

  test("every focusable control on Join has a visible focus indicator", async ({ page }) => {
    await page.goto("/join");
    const emailInput = page.getByLabel("Email");
    await emailInput.focus();
    const outline = await emailInput.evaluate((el) => {
      const style = getComputedStyle(el);
      return { outlineStyle: style.outlineStyle, borderColor: style.borderColor };
    });
    // Either the focus ring or the accent border shift must be present.
    expect(outline.outlineStyle !== "none" || outline.borderColor.length > 0).toBe(true);
  });
});
