import { test, expect, type ConsoleMessage } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers";

// Brief §17 "Spoiler regression test": the seeded title "Whiplash"
// must never appear in pre-reveal HTML, JSON, storage filenames,
// accessible labels, email payloads, console output or logs.
// Email payloads are covered in tests/unit/spoiler/email-templates.test.ts
// (they don't need a browser). This file covers everything that does.
const FORBIDDEN = /whiplash/i;

test.describe("spoiler regression — public surfaces (always run)", () => {
  test("no forbidden title in HTML, console, or accessibility tree on any public page", async ({
    page,
  }) => {
    const consoleMessages: ConsoleMessage[] = [];
    page.on("console", (msg) => consoleMessages.push(msg));

    for (const path of ["/", "/how-it-works", "/join", "/terms", "/privacy", "/film-rights"]) {
      await page.goto(path);
      expect(await page.content()).not.toMatch(FORBIDDEN);

      const snapshot = await page.accessibility.snapshot();
      expect(JSON.stringify(snapshot)).not.toMatch(FORBIDDEN);
    }

    for (const msg of consoleMessages) {
      expect(msg.text()).not.toMatch(FORBIDDEN);
    }
  });

  test("manifest and service worker never mention a title", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).text();
    expect(manifest).not.toMatch(FORBIDDEN);
    const sw = await (await request.get("/sw.js")).text();
    expect(sw).not.toMatch(FORBIDDEN);
  });

  test("the reveal route never responds before authentication, forbidden title or not", async ({
    request,
  }) => {
    const response = await request.post("/api/reveal/opening/00000000-0000-0000-0000-000000000000");
    expect(response.status()).toBe(401);
    const body = await response.text();
    expect(body).not.toMatch(FORBIDDEN);
  });

  test("API responses are never cacheable", async ({ request }) => {
    // A cached response is one more place a sealed title could survive,
    // so no intermediary may hold one (brief §11).
    const response = await request.post("/api/watch", { failOnStatusCode: false });
    expect(response.headers()["cache-control"]).toMatch(/no-store/);
  });
});

test.describe("spoiler regression — signed-in Tonight, before reveal", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());

  test("sealed Tonight leaks nothing in HTML, JSON, or storage path before reveal", async ({
    page,
  }) => {
    const responses: { url: string; body: string }[] = [];
    page.on("response", async (response) => {
      if (
        response.request().resourceType() === "xhr" ||
        response.request().resourceType() === "fetch"
      ) {
        const body = await response.text().catch(() => "");
        responses.push({ url: response.url(), body });
      }
    });

    await page.goto("/tonight");
    expect(await page.content()).not.toMatch(FORBIDDEN);

    const snapshot = await page.accessibility.snapshot();
    expect(JSON.stringify(snapshot)).not.toMatch(FORBIDDEN);

    // The No Trailer storage path must be a UUID filename, not a title.
    const videoSrc = await page
      .locator("video")
      .getAttribute("src")
      .catch(() => null);
    if (videoSrc) {
      expect(videoSrc).not.toMatch(FORBIDDEN);
      expect(videoSrc).toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm)/i,
      );
    }

    for (const response of responses) {
      expect(response.body).not.toMatch(FORBIDDEN);
    }
  });
});
