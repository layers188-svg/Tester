import { test, expect } from "@playwright/test";

test.describe("installable PWA (brief §17 item 10)", () => {
  test("manifest is linked, valid, and portrait/standalone", async ({ page, request }) => {
    await page.goto("/");
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(manifestHref).toBe("/manifest.webmanifest");

    const response = await request.get(manifestHref!);
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();

    expect(manifest.name).toBe("House Dark");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(
      true,
    );
  });

  test("service worker registers", async ({ page }) => {
    await page.goto("/");
    const registered = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      return Boolean(registration);
    });
    expect(registered).toBe(true);
  });

  test("service worker script is reachable and never caches API or app routes", async ({
    request,
  }) => {
    const response = await request.get("/sw.js");
    expect(response.ok()).toBeTruthy();
    const body = await response.text();
    expect(body).toMatch(/network only/i);
    // The worker documents that it deliberately ignores /api/* in a
    // comment — assert the actual cache allowlist instead of a naive
    // substring check, which would also match that comment.
    expect(body).toMatch(/CACHEABLE_PATH_PREFIXES = \["\/icons\/", "\/fonts\/"\]/);
  });

  test("apple touch icon and theme colour are set", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#030303");
  });
});
