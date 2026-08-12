import { describe, expect, it } from "vitest";
import { nightlyOpeningEmail } from "@/lib/email/templates";
import { assertSafeEmailData, assertSafeEmailPayload } from "@/lib/email/sanitize";
import { findTitleLeaks } from "@/lib/spoiler/detector";

/**
 * Regression: scanning *rendered* email for titles took the whole
 * notification queue down for short titles.
 *
 * The live guard used to run the substring scan over the rendered
 * payload. Because the scan is case-insensitive and unanchored, a film
 * called "It" matched `initial-scale` in the viewport meta, "Up"
 * matched `text-transform:uppercase`, and "Us" matched the "us" inside
 * `<title>House Dark</title>`. Those are all real films. Programming
 * any of them would have failed every operational email in the product
 * — nightly opening included — through five retries and into `failed`,
 * with no member-visible symptom except silence.
 *
 * The fix is not a better regex: the body copy of the nightly email
 * reads "you will not know what it is", so the film "It" collides with
 * the pronoun on any word-boundary match too. Rendered output simply
 * cannot be scanned for short titles. The live guard now scans the
 * dynamic data a template is rendered from, where a title has no
 * legitimate reason to appear at all.
 */

/** Real films whose titles are substrings of ordinary template chrome. */
const SHORT_TITLES = ["It", "Up", "Us", "Her", "Heat", "Nope", "Drive", "Room"];

describe("short film titles do not break the send path", () => {
  it.each(SHORT_TITLES)("a house programming %s can still send the nightly email", (title) => {
    // The payload the queue actually stores for a nightly opening.
    const payload = { to: "member@example.com", openingNumber: 4 };
    expect(() => assertSafeEmailData(payload, [title], "nightly_opening")).not.toThrow();
  });

  it("demonstrates the old rendered-output scan really did block these", () => {
    // Guards the reasoning above, so nobody "simplifies" the live path
    // back onto assertSafeEmailPayload. If the templates ever change so
    // that this no longer trips, the comment above is stale.
    const email = nightlyOpeningEmail({ to: "member@example.com", openingNumber: 4 });
    const blocked = SHORT_TITLES.filter((t) => findTitleLeaks(email, [t]).length > 0);
    expect(blocked).toEqual(["It", "Up", "Us"]);
  });

  it("still blocks a title that genuinely reaches the data", () => {
    // The whole point of the guard: a title in the template inputs.
    const payload = { to: "member@example.com", openingNumber: 4, title: "Whiplash" };
    expect(() => assertSafeEmailData(payload, ["Whiplash"], "nightly_opening")).toThrow(
      /Title leak detected/,
    );
  });

  it("blocks a short title that genuinely reaches the data", () => {
    // Word-boundary matching must not become a hole for short titles.
    const payload = { to: "member@example.com", note: "Tonight we are showing Up." };
    expect(() => assertSafeEmailData(payload, ["Up"], "editorial_edm")).toThrow(
      /Title leak detected/,
    );
  });

  it("does not flag a short title buried inside a longer word", () => {
    const payload = { to: "member@example.com", note: "An uplifting, upbeat evening." };
    expect(() => assertSafeEmailData(payload, ["Up"], "editorial_edm")).not.toThrow();
  });

  it("keeps the aggressive substring scan for the regression suite", () => {
    // assertSafeEmailPayload is still the strict one — it is what the
    // spoiler suite uses against rendered output with a distinctive
    // seed title, where over-triggering is the desired behaviour.
    const email = nightlyOpeningEmail({ to: "member@example.com", openingNumber: 4 });
    expect(() => assertSafeEmailPayload(email, ["Whiplash"])).not.toThrow();
    expect(() => assertSafeEmailPayload({ ...email, subject: "Whiplash" }, ["Whiplash"])).toThrow(
      /Title leak detected/,
    );
  });
});

describe("whole-word matching", () => {
  it("treats punctuation and quotes as boundaries", () => {
    for (const text of ['"Up"', "(Up)", "Up.", "Up, tonight", "—Up—"]) {
      expect(findTitleLeaks(text, ["Up"], { wholeWord: true })).toHaveLength(1);
    }
  });

  it("does not treat letters or digits as boundaries", () => {
    for (const text of ["uppercase", "Upton", "backup", "Up2Date"]) {
      expect(findTitleLeaks(text, ["Up"], { wholeWord: true })).toHaveLength(0);
    }
  });

  it("handles multi-word titles", () => {
    expect(
      findTitleLeaks("We showed Get Out last night.", ["Get Out"], { wholeWord: true }),
    ).toHaveLength(1);
    expect(findTitleLeaks("Forget Outlines.", ["Get Out"], { wholeWord: true })).toHaveLength(0);
  });
});
