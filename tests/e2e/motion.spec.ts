import { test, expect, type Page } from "@playwright/test";

/**
 * Rendered motion QA (handover 01_MOTION_SYSTEM.md §17, acceptance
 * test H).
 *
 *   Do not approve motion by reading CSS. For every signature sequence:
 *   render in a real browser, record or inspect intermediate frames,
 *   verify geometry actually changes, verify no state flashes before it
 *   should, verify motion remains obvious at normal speed.
 *
 * So these tests measure geometry rather than asserting that a class
 * name is present. A transition that was accidentally deleted, or
 * reduced to a few pixels, fails here — which a class-name assertion
 * would not catch, and which is the exact failure the handover records
 * from the prototype.
 *
 * They run against /dev/stage, the staging state simulator, which mounts
 * the real components with fixture props and stubs the network. That is
 * what lets them run with no Supabase project, unlike the journeys in
 * the other spec files.
 *
 * The fixture's protected title is a film that does not exist. It works
 * as a canary exactly as well as a real one — the property under test is
 * that whatever the reveal route returns is absent before the reveal —
 * and it means no real title is sitting in a shipped client chunk. See
 * src/app/dev/stage/fixtures.ts.
 */

const STAGE = "/dev/stage";
const PROTECTED_TITLE = /sundown arcadia/i;

/** Motion principle 5: 3-5px micro motion does not count as the effect. */
const VISIBLE_TRAVEL_PX = 24;

/**
 * The way in, wherever this is running.
 *
 * These tests run against three deployments: the dev server, the built
 * Worker, and the exported review site, which is published under a base
 * path and writes trailing slashes. All three are the same application
 * and the assertion is about where the door leads, so it is matched
 * rather than compared.
 */
const JOIN_HREF = /\/join\/?$/;

async function gotoStage(page: Page, state: string) {
  await page.goto(`${STAGE}?state=${state}`);
  await page.waitForLoadState("networkidle");
}

async function frameBox(page: Page) {
  return page
    .locator('[class*="TonightExperience-module"][class*="frame"]')
    .first()
    .evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height, top: rect.top };
    });
}

test.describe("Tonight: sealed becomes clue becomes the picture", () => {
  test("one frame changes geometry through the ritual", async ({ page }) => {
    await gotoStage(page, "sealed");

    const seal = page.getByRole("button", { name: /tonight is sealed/i });
    await expect(seal).toBeVisible();
    const sealed = await frameBox(page);

    // Press and hold. The brass rule is drawn by the press itself.
    const box = (await seal.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(300);

    const holdProgress = await page
      .locator('[class*="holdFill"]')
      .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    expect(holdProgress, "the hold is drawn as the member presses").toBeGreaterThan(0.2);
    expect(holdProgress, "and is not finished before the hold is").toBeLessThan(1);

    // Releasing early returns the object to sealed (motion system §6).
    await page.mouse.up();
    await page.waitForTimeout(200);
    await expect(seal, "an early release does not open the clue").toBeVisible();

    // Hold it properly this time.
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
    await page.waitForTimeout(700);

    await expect(page.getByText(/that is the whole clue/i)).toBeVisible();
    const clue = await frameBox(page);

    // The frame grew and came forward; the room receded behind it.
    expect(clue.width).toBeGreaterThan(sealed.width);
    expect(clue.height).toBeGreaterThan(sealed.height);
    const supportOpacity = await page
      .locator('[class*="TonightExperience-module"][class*="support"]')
      .first()
      .evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(supportOpacity, "surrounding information recedes").toBeLessThan(0.1);

    // The clue frame becomes the playback surface — no new page.
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(900);
    const trailer = await frameBox(page);
    expect(trailer.height - clue.height).toBeGreaterThan(VISIBLE_TRAVEL_PX);

    // No autoplay: the gate is NO TRAILER / 10 SECONDS / PLAY.
    await expect(page.getByText(/no trailer/i).first()).toBeVisible();
    await expect(page.getByText(/10 seconds/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^play$/i })).toBeVisible();

    // Nothing has leaked at any point in the sequence.
    await expect(page.locator("body")).not.toContainText(PROTECTED_TITLE);
  });

  test("the black hold sits between the picture and the title", async ({ page }) => {
    await gotoStage(page, "sealed");

    const seal = page.getByRole("button", { name: /tonight is sealed/i });
    const box = (await seal.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(700);

    // Sample the DOM every frame from the moment the media ends, so the
    // hold is measured rather than assumed.
    await page.evaluate(() => {
      const w = window as unknown as { __hold?: { endedAt: number; first: number | null } };
      w.__hold = { endedAt: 0, first: null };
      const video = document.querySelector("video")!;
      video.addEventListener("ended", () => {
        w.__hold!.endedAt = performance.now();
        const tick = () => {
          const dt = performance.now() - w.__hold!.endedAt;
          if (w.__hold!.first === null && /sundown arcadia/i.test(document.body.innerText)) {
            w.__hold!.first = dt;
          }
          if (dt < 2000) requestAnimationFrame(tick);
        };
        tick();
      });
    });

    await page.getByRole("button", { name: /^play$/i }).click();

    // The picture is running, and the title is not in the DOM.
    await page.waitForTimeout(1200);
    await expect(page.locator("body")).not.toContainText(PROTECTED_TITLE);

    await page.waitForFunction(() => document.body.innerText.match(/sundown arcadia/i) !== null, {
      timeout: 25_000,
    });

    const holdMs = await page.evaluate(
      () => (window as unknown as { __hold: { first: number | null } }).__hold.first,
    );

    // Handover §3: "300 to 500 ms black hold", then the server reveal.
    expect(holdMs, "the title waits for the black hold").not.toBeNull();
    expect(holdMs!).toBeGreaterThanOrEqual(300);
    expect(holdMs!).toBeLessThan(1200);
  });

  test("a broken No Trailer offers Retry and never reveals", async ({ page }) => {
    await gotoStage(page, "sealed");

    const seal = page.getByRole("button", { name: /tonight is sealed/i });
    const box = (await seal.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.waitForTimeout(700);

    await page.locator("video").evaluate((el) => el.dispatchEvent(new Event("error")));
    await page.waitForTimeout(300);

    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
    await expect(page.getByText(/stays sealed/i)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(PROTECTED_TITLE);

    // The retry returns to the gate rather than a dead end.
    await page.getByRole("button", { name: /retry/i }).click();
    await expect(page.getByRole("button", { name: /^play$/i })).toBeVisible();
  });
});

test.describe("The Room: the words are the scenery", () => {
  test("scrolling moves, scales and softens the voices", async ({ page }) => {
    await gotoStage(page, "room");

    await expect(page.getByRole("heading", { name: "The Room" })).toBeVisible();
    await page.getByRole("button", { name: /your circle/i }).click();
    await page.waitForTimeout(400);

    const voice = page.locator('article[class*="voice"]').first();
    const sample = () =>
      voice.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          y: new DOMMatrix(style.transform).f,
          scale: new DOMMatrix(style.transform).a,
          opacity: Number(style.opacity),
          blurred: style.filter !== "none",
        };
      });

    const atTop = await sample();
    const height = await page.evaluate(() => document.documentElement.scrollHeight);

    // Sampled inside this voice's own window. Each voice is anchored to
    // a slice of the scroll and holds at the edge of the field once it
    // has passed, so sampling the first voice at the end of the Room
    // would compare two identical clamped values and prove nothing.
    await page.evaluate((h) => window.scrollTo(0, h * 0.18), height);
    await page.waitForTimeout(400);
    const atMiddle = await sample();
    await page.evaluate((h) => window.scrollTo(0, h * 0.4), height);
    await page.waitForTimeout(400);
    const atEnd = await sample();

    // Position, scale and focus all change, and by an amount that can
    // be seen at normal speed.
    expect(Math.abs(atTop.y - atEnd.y)).toBeGreaterThan(200);
    expect(atTop.y).toBeGreaterThan(atMiddle.y);
    expect(atMiddle.y).toBeGreaterThan(atEnd.y);
    expect(atTop.scale).toBeGreaterThan(atEnd.scale);
    expect(atMiddle.opacity).not.toBeCloseTo(atEnd.opacity, 2);
    expect(atEnd.blurred, "a distant voice is out of focus").toBe(true);

    // Whatever the field does, it never scrolls the page sideways.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("reduced motion keeps every voice and drops the movement", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await gotoStage(page, "room");

    await page.getByRole("button", { name: /your circle/i }).click();
    await page.waitForTimeout(300);

    // The same three modes, and the voices are readable rather than staged.
    await expect(page.getByRole("button", { name: /your review/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /the house/i })).toBeVisible();
    await expect(page.locator('article[class*="staticVoice"]').first()).toBeVisible();
    expect(await page.locator('article[class*="staticVoice"]').count()).toBeGreaterThan(1);

    await context.close();
  });
});

test.describe("Home to The Room", () => {
  test("the preview is promoted into a layer and carries its quote across", async ({ page }) => {
    await gotoStage(page, "door");

    const preview = page.locator('[class*="RoomPreview-module"][class*="preview"]');
    await expect(preview).toBeVisible();

    // The preview shows what the Room will show: the member's own words
    // and one Circle voice.
    await expect(preview).toContainText(/the room is open/i);
    const quote = (await preview.locator('[class*="voice"]').first().innerText()).slice(0, 24);
    const from = await preview.evaluate((el) => el.getBoundingClientRect().top);

    await preview.click();

    const panel = page.locator('[class*="room-transition-module"][class*="panel"]');
    const behind = page.locator('[class*="room-transition-module"][class*="behind"]').first();

    // Step 1-2: the preview is promoted, starting from where it was.
    await expect(panel).toBeVisible();
    const started = await panel.evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(started - from), "the layer starts at the preview").toBeLessThan(60);

    await page.waitForTimeout(450);

    // Step 3: Home has moved back and lost contrast. Sampled here
    // rather than on the first frame — it is a transition, and at the
    // instant the layer appears it has not started moving yet.
    const receded = await behind.evaluate((el) => ({
      scale: new DOMMatrix(getComputedStyle(el).transform).a,
      opacity: Number(getComputedStyle(el).opacity),
    }));
    expect(receded.scale).toBeLessThan(1);
    expect(receded.opacity).toBeLessThan(0.8);

    const midway = await panel.evaluate((el) => {
      const rule = el.querySelector('[class*="rule"]')!;
      const title = el.querySelector('[class*="roomTitle"]')!;
      return {
        top: el.getBoundingClientRect().top,
        rule: new DOMMatrix(getComputedStyle(rule).transform).a,
        title: Number(getComputedStyle(title).opacity),
        text: el.textContent ?? "",
      };
    });

    // Step 4: it expanded toward the Room stage.
    expect(from - midway.top, "the layer travels").toBeGreaterThan(200);
    // Step 5: the quote is still on screen.
    expect(midway.text).toContain(quote.slice(0, 12));
    // Steps 6-7: the brass rule extends and THE ROOM resolves.
    expect(midway.rule).toBeGreaterThan(0.4);
    expect(midway.title).toBeGreaterThan(0.5);

    // Step 9: the layer hands back, and does not linger.
    await expect(panel).toHaveCount(0, { timeout: 3000 });
    await expect(page.getByRole("heading", { name: "The Room" })).toBeVisible();
    await expect(behind).toHaveJSProperty("dataset.receding", undefined);
  });

  test("reduced motion goes straight there", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await gotoStage(page, "door");

    await page.locator('[class*="RoomPreview-module"][class*="preview"]').click();

    // No layer, no travel — but the state change still happens.
    await expect(page.getByRole("heading", { name: "The Room" })).toBeVisible();
    await expect(page.locator('[class*="room-transition-module"][class*="panel"]')).toHaveCount(0);

    await context.close();
  });
});

test.describe("Trust Us: one film, and never a list", () => {
  test("Seen it scrubs the film out and brings the next in", async ({ page }) => {
    await gotoStage(page, "trust");

    // The opening state offers territories, not films.
    await expect(page.getByRole("button", { name: "Ambition" })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/territory film/i);

    await page.getByRole("button", { name: "Ambition" }).click();
    await page.waitForTimeout(900);

    const first = await page.locator('main article [class*="title"]').first().innerText();
    expect(await page.locator("main article").count(), "exactly one recommendation").toBe(1);

    await page.locator("main button").filter({ hasText: "Seen it" }).click();
    await page.waitForTimeout(200);

    // Mid-scrub: the outgoing film has left the centre and is blurred.
    const boxes = await page.locator("main article").evaluateAll((els) =>
      els.map((el) => ({
        left: el.getBoundingClientRect().left,
        blurred: getComputedStyle(el).filter !== "none",
      })),
    );
    expect(boxes.length, "both films are on screen during the movement").toBe(2);
    expect(
      boxes.some((b) => b.blurred),
      "speed-responsive blur",
    ).toBe(true);
    expect(Math.max(...boxes.map((b) => Math.abs(b.left)))).toBeGreaterThan(VISIBLE_TRAVEL_PX);

    await page.waitForTimeout(900);
    const second = await page.locator('main article [class*="title"]').first().innerText();
    expect(second, "a different film, without passing through a list").not.toBe(first);
    expect(await page.locator("main article").count()).toBe(1);
  });

  test("Trust us closes the information down", async ({ page }) => {
    await gotoStage(page, "trust");
    await page.getByRole("button", { name: "Ambition" }).click();
    await page.waitForTimeout(900);

    await page.locator("main button").filter({ hasText: "Trust us" }).click();
    await page.waitForTimeout(1000);

    await expect(page.getByText(/that.s all you get/i)).toBeVisible();
    await expect(page.getByText(/go in blind/i)).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/synopsis|cast|director|rating|review/i);
  });
});

test.describe("Circle: the seal is one object", () => {
  test("opening transforms the object rather than replacing it", async ({ page }) => {
    await gotoStage(page, "seal");

    const object = page.locator('[class*="SealObject-module"][class*="object"]').first();
    await expect(object).toHaveAttribute("data-state", "sealed");
    await expect(page.getByText(/a film is waiting/i)).toBeVisible();
    await expect(page.getByText(/from maya/i)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(PROTECTED_TITLE);

    const seamBefore = await object
      .locator('[class*="seam"]')
      .evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(seamBefore).toBeGreaterThan(0.5);

    await page.getByRole("button", { name: /enter under seal/i }).click();

    // No generic interstitial at any point (motion system §13).
    await expect(page.locator("main")).not.toContainText(/^opening…$/i);

    await page.waitForTimeout(1200);
    await expect(object, "the same object, now open").toHaveAttribute("data-state", "open");
    await expect(page.locator("body")).toContainText(PROTECTED_TITLE);

    const seamAfter = await object
      .locator('[class*="seam"]')
      .evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(seamAfter, "the seam has parted").toBeLessThan(0.2);
  });

  test("the seal compresses to the documented 80-85 per cent", async ({ page }) => {
    await gotoStage(page, "seal");
    const object = page.locator('[class*="SealObject-module"][class*="object"]').first();

    await object.evaluate((el) => el.setAttribute("data-state", "sealing"));
    await page.waitForTimeout(900);

    const scale = await object.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    expect(scale).toBeGreaterThanOrEqual(0.8);
    expect(scale).toBeLessThanOrEqual(0.85);
  });
});

test.describe("Library: records unfold in place", () => {
  test("the record grows and its neighbours make room", async ({ page }) => {
    await gotoStage(page, "library");

    const rows = page.locator('li[class*="record"]');
    const countBefore = await rows.count();
    const before = await rows.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height),
    );
    const neighbourTopBefore = await rows.nth(3).evaluate((el) => el.getBoundingClientRect().top);

    await rows.nth(2).getByRole("button").first().click();
    await page.waitForTimeout(800);

    const after = await rows.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height),
    );
    const neighbourTopAfter = await rows.nth(3).evaluate((el) => el.getBoundingClientRect().top);

    expect(after[2] - before[2], "the record grows").toBeGreaterThan(VISIBLE_TRAVEL_PX);
    expect(neighbourTopAfter - neighbourTopBefore, "the next record makes room").toBeGreaterThan(
      VISIBLE_TRAVEL_PX,
    );
    expect(await rows.count(), "nothing was replaced by a modal").toBe(countBefore);

    // Closing reverses it.
    await rows.nth(2).getByRole("button").first().click();
    await page.waitForTimeout(800);
    const closed = await rows.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height),
    );
    expect(closed[2]).toBeCloseTo(before[2], 0);
  });

  test("search filters instantly and says the specified line", async ({ page }) => {
    await gotoStage(page, "library");
    const search = page.getByRole("searchbox");
    const rows = page.locator('li[class*="record"]');

    await search.fill("Burning");
    await expect(rows).toHaveCount(1);

    await search.fill("Solaris");
    await expect(rows).toHaveCount(0);
    await expect(page.getByText("Nothing under that title.")).toBeVisible();

    await search.fill("");
    await expect(rows).toHaveCount(4);
  });
});

test.describe("The entry", () => {
  test("opens from darkness, responds to the pointer, and closes cleanly", async ({ page }) => {
    await page.goto("/");

    const entry = page.locator('[class*="EntryAperture-module"][class*="entry"]');
    await expect(entry).toBeVisible();

    // I1: not a dead black screen — the wordmark is there from the start.
    await expect(page.locator('[class*="markLayer"] svg')).toBeAttached();

    // I2: within a deterministic delay, the field is visible.
    await expect(async () => {
      const strength = await entry.evaluate((el) =>
        Number(getComputedStyle(el).getPropertyValue("--light-strength")),
      );
      expect(strength).toBeGreaterThan(0);
    }).toPass({ timeout: 3000 });

    await expect(page.getByText(/find the joy in not knowing/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /enter in the dark/i })).toBeVisible();

    // I3: the pointer moves the light, but not excessively.
    const field = page.locator('[class*="EntryAperture-module"][class*="field"]').first();
    const lightX = () =>
      field.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--light-x")) || 50);
    const before = await lightX();
    await page.mouse.move(20, 300);
    await page.waitForTimeout(600);
    const after = await lightX();
    expect(Math.abs(after - before)).toBeGreaterThan(1);
    expect(Math.abs(after - before), "moved slightly, not thrown across").toBeLessThan(25);

    // I4-I6: the aperture closes, holds, and the House arrives.
    await page.getByRole("link", { name: /enter in the dark/i }).click();
    await expect(async () => {
      await expect(entry).toHaveAttribute("data-phase", /closing|held/);
    }).toPass({ timeout: 2000 });

    // What matters is that it lands on /join, not the exact string. The
    // published review site is served from a subdirectory with trailing
    // slashes, so an equality check would be testing the deployment's
    // URL style rather than the aperture's exit. See JOIN_HREF.
    await page.waitForURL(JOIN_HREF, { timeout: 8000 });
  });

  test("is not a trap without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");

    await expect(
      page.locator('[class*="EntryAperture-module"][class*="entry"]'),
      "the aperture removes itself",
    ).toBeHidden();

    // The House underneath is readable, and its own way in still works.
    // The aperture's Enter link is inside the hidden overlay, so it is
    // correctly not exposed at all here — the header's link is the one
    // a visitor without scripting actually reaches.
    const house = page.locator('[class*="EntryGate-module"][class*="house"]');
    await expect(house.locator("h1").first()).toBeVisible();
    await expect(house.getByRole("link", { name: /join or sign in/i })).toHaveAttribute(
      "href",
      JOIN_HREF,
    );

    await context.close();
  });
});
