import { test, expect } from "@playwright/test";
import { signedInAs, skipWithoutLiveSupabase } from "./helpers";
import { PERSONAS } from "./auth-state";
import { FIXTURE } from "./fixtures";

// Brief §17 item 4: "Mark watched and submit six words."
test.describe("mark watched and leave six words", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());
  // Runs as the friend, who has revealed. The member stays sealed for
  // Tonight and the spoiler journey.
  signedInAs(PERSONAS.friend);

  test("watching asks for six words, and the room opens once they are in", async ({ page }) => {
    // The friend has revealed, so Tonight is the House now, and the
    // House offers exactly one way on. Walking through it rather than
    // deep-linking is deliberate: this journey is the whole point of
    // the hero action, so if that action ever stops leading here the
    // test should be the thing that notices.
    await page.goto("/tonight");
    await page.getByRole("link", { name: /watch when you.re ready/i }).click();
    await expect(page).toHaveURL(/\/opening\//);

    await page.getByRole("button", { name: /mark watched/i }).click();

    await expect(page.getByText(/six words after the picture/i)).toBeVisible();

    // Nobody else's words are on this screen. That is the product rule,
    // not a layout preference, so it is asserted rather than assumed.
    await expect(page.getByText(/from the room/i)).toHaveCount(0);

    const field = page.getByLabel("Your six words");
    await field.fill("I did not see that coming");
    await page.getByRole("button", { name: /leave my six words/i }).click();

    // The submission moment: the words hold, then the room opens.
    await expect(page.getByText(/your words are in/i)).toBeVisible();
    await expect(page.getByText(/the room is open/i)).toBeVisible();

    await page.getByRole("link", { name: /enter the room/i }).click();
    await expect(page).toHaveURL(/\/room\//);
    await expect(page.getByText(/see what stayed with everyone else/i)).toBeVisible();
    await expect(page.getByText(/i did not see that coming/i)).toBeVisible();

    // The member's own words come with the page, not with the fetch.
    // Everyone else's are worth waiting for; being shown a loading line
    // where your own writing should be is the Room asking you to wait
    // for something you already know. It is also what lets the words
    // carry across from the submission moment as one object rather than
    // being redrawn here.
    const html = await (await page.request.get(`/room/${FIXTURE.openingId}`)).text();
    expect(html).toContain("I did not see that coming");
  });

  // The seventh-word cap is asserted in tests/unit/word-slots.test.tsx.
  // It belonged there rather than here: as a second journey in this
  // file it shared the friend persona with the one above, which
  // publishes, so it raced for a "Mark watched" button that the first
  // test had already spent.

  test("the server refuses a seventh word, and accepts fewer than six", async ({ request }) => {
    // The rule changed from "exactly six" to "up to six": a reaction is
    // not a form, and "Exhausting." is a complete answer to a film.
    // What is still refused is a seventh word, because six is the shape
    // the Room is built to hold.
    const tooMany = await request.post("/api/six-words", {
      data: {
        openingId: "00000000-0000-0000-0000-000000000000",
        body: "One two three four five six seven",
      },
    });
    // 422, not 401: there is a session now, so the request gets as far
    // as the six-word rule and is refused on its merits.
    expect(tooMany.status()).toBe(422);
    expect((await tooMany.json()).error).toMatch(/too many/i);

    // Two words gets past the rule and fails on the opening instead,
    // which is the proof that the length is no longer what stops it.
    const short = await request.post("/api/six-words", {
      data: { openingId: "00000000-0000-0000-0000-000000000000", body: "Too short" },
    });
    expect(short.status()).not.toBe(422);
  });
});

/**
 * The core rule, tested from the outside.
 *
 * Now that the form no longer lists anyone else's words, /room is the
 * only route to them, which makes it the thing worth attacking. The
 * member persona has never revealed this opening and never written
 * anything about it, which is exactly the state the route has to hold
 * against — including for someone who types the URL rather than
 * following a link to it.
 */
test.describe("the room is shut until you have spoken", () => {
  test.beforeEach(() => skipWithoutLiveSupabase());
  signedInAs(PERSONAS.member);

  test("a member who has not spoken is sent back, and gets no title on the way", async ({
    page,
  }) => {
    await page.goto(`/room/${FIXTURE.openingId}`);

    await expect(page).toHaveURL(/\/tonight/);
    expect(await page.content()).not.toMatch(new RegExp(FIXTURE.filmTitle, "i"));
  });

  test("the after-credits API tells them nothing either", async ({ request }) => {
    const response = await request.get(`/api/after-credits/${FIXTURE.openingId}`);
    expect(response.ok()).toBe(true);

    const payload = await response.json();
    // Zero rows is the contract: the caller cannot tell a shut room from
    // an empty one, and neither can anybody reading this response.
    expect(payload.open).toBe(false);
    expect(payload.reviews).toEqual([]);
    expect(await response.text()).not.toMatch(new RegExp(FIXTURE.filmTitle, "i"));
  });
});
