import { describe, expect, it } from "vitest";
import {
  afterCreditsEmail,
  editorialEmail,
  nightlyOpeningEmail,
  screeningReminderEmail,
  sealedRecommendationEmail,
} from "@/lib/email/templates";
import { assertSafeEmailPayload } from "@/lib/email/sanitize";
import { findTitleLeaks } from "@/lib/spoiler/detector";

// The seeded, protected title (brief §18, §17 "Spoiler regression test").
const FORBIDDEN = ["Whiplash"];

describe("operational email templates never carry a title", () => {
  it("nightly opening email", () => {
    const email = nightlyOpeningEmail({ to: "member@example.com", openingNumber: 1 });
    expect(findTitleLeaks(email, FORBIDDEN)).toHaveLength(0);
    expect(() => assertSafeEmailPayload(email, FORBIDDEN)).not.toThrow();
  });

  it("sealed recommendation email", () => {
    const email = sealedRecommendationEmail({ to: "member@example.com", senderDisplayName: "Ari" });
    expect(findTitleLeaks(email, FORBIDDEN)).toHaveLength(0);
  });

  it("screening reminder email", () => {
    const email = screeningReminderEmail({
      to: "member@example.com",
      circleName: "Thursday Circle",
      scheduledForLabel: "Thursday at 8:00 PM",
    });
    expect(findTitleLeaks(email, FORBIDDEN)).toHaveLength(0);
  });

  it("after credits email", () => {
    const email = afterCreditsEmail({ to: "member@example.com" });
    expect(findTitleLeaks(email, FORBIDDEN)).toHaveLength(0);
  });

  it("editorial email composed without a title stays clean", () => {
    const email = editorialEmail({
      to: "member@example.com",
      heading: "The house is open",
      body: "A new opening is ready for you tonight.",
      actionLabel: "Enter tonight",
      actionHref: "https://housedark.app/tonight",
    });
    expect(findTitleLeaks(email, FORBIDDEN)).toHaveLength(0);
  });
});

describe("assertSafeEmailPayload", () => {
  it("blocks a send if a title is accidentally injected", () => {
    const leaked = sealedRecommendationEmail({
      to: "member@example.com",
      // A title should never actually reach this parameter — this
      // simulates the detector catching it if it somehow did.
      senderDisplayName: "Whiplash fan",
    });
    // The throw names where the leak is, never what leaked — the
    // message can end up in a log or in a member-readable column.
    expect(() => assertSafeEmailPayload(leaked, FORBIDDEN)).toThrow(/Title leak detected/);
    expect(() => assertSafeEmailPayload(leaked, FORBIDDEN)).not.toThrow(/Whiplash/);
  });

  it("redacts the recipient address in the failure it raises", () => {
    const leaked = sealedRecommendationEmail({
      to: "member@example.com",
      senderDisplayName: "Whiplash fan",
    });
    expect(() => assertSafeEmailPayload(leaked, FORBIDDEN)).not.toThrow(/member@example\.com/);
  });
});
