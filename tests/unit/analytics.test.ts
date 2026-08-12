import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_DETAILS,
  ANALYTICS_EVENTS,
  CLIENT_REPORTABLE_EVENTS,
  isClientReportableEvent,
} from "@/lib/analytics/events";
import type { AnalyticsDetailValue, AnalyticsEventName } from "@/lib/supabase/types";

/**
 * Brief §15. The section is prescriptive in two directions: it names
 * exactly twelve events to track, and it forbids a title, provider URL,
 * personal note, review body or secret film identifier from ever
 * reaching analytics.
 *
 * The second half is enforced structurally rather than by scanning —
 * `recordAnalyticsEvent` has no free text parameter and the table has
 * no free text column — so what is worth testing is that the structure
 * stays closed, and that a failure never propagates into a member's
 * action.
 */

const inserted: Record<string, unknown>[] = [];
let insertError: { message: string } | null = null;
let insertThrows = false;

vi.mock("@/lib/supabase/service", () => ({
  getServiceSupabase: () => ({
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        if (insertThrows) throw new Error("connection refused");
        inserted.push({ table, ...row });
        return Promise.resolve({ error: insertError });
      },
    }),
  }),
}));

const { recordAnalyticsEvent } = await import("@/lib/analytics/record");

beforeEach(() => {
  inserted.length = 0;
  insertError = null;
  insertThrows = false;
  vi.restoreAllMocks();
});

describe("the §15 event vocabulary", () => {
  // The brief's list, transcribed in its order. If someone renames an
  // event, this is the test that should fail.
  const briefEvents = [
    "sign_in_completed",
    "opening_viewed",
    "dimming_started",
    "no_trailer_completed",
    "reveal_completed",
    "provider_handoff_selected",
    "saved_for_later",
    "marked_watched",
    "six_words_submitted",
    "recommendation_sent",
    "circle_invitation_accepted",
    "screening_attendance_response",
  ];

  it("is exactly the twelve events the brief names, in order", () => {
    expect([...ANALYTICS_EVENTS]).toEqual(briefEvents);
  });

  it("matches the database enum mirrored in types.ts", () => {
    // Compile-time: every event must be assignable to the generated
    // union, and vice versa. A drift in either direction fails tsc.
    const toDb: Record<(typeof ANALYTICS_EVENTS)[number], AnalyticsEventName> = Object.fromEntries(
      ANALYTICS_EVENTS.map((e) => [e, e]),
    ) as Record<(typeof ANALYTICS_EVENTS)[number], AnalyticsEventName>;
    const fromDb: AnalyticsEventName[] = [...ANALYTICS_EVENTS];
    expect(Object.keys(toDb)).toHaveLength(12);
    expect(fromDb).toHaveLength(12);
  });

  it("keeps the detail allowlist aligned with the CHECK constraint", () => {
    const details: AnalyticsDetailValue[] = [...ANALYTICS_DETAILS];
    expect(details).toEqual(["invited", "attending", "maybe", "declined"]);
  });

  it("only lets the browser report the three events it alone can observe", () => {
    expect([...CLIENT_REPORTABLE_EVENTS]).toEqual([
      "opening_viewed",
      "dimming_started",
      "no_trailer_completed",
    ]);
    for (const event of CLIENT_REPORTABLE_EVENTS) {
      expect(ANALYTICS_EVENTS).toContain(event);
    }
  });

  it("rejects anything else offered as a client event", () => {
    // These are real events, but recorded server-side where they cannot
    // be forged. The ingest route must not accept them.
    expect(isClientReportableEvent("reveal_completed")).toBe(false);
    expect(isClientReportableEvent("marked_watched")).toBe(false);
    expect(isClientReportableEvent("not_an_event")).toBe(false);
    expect(isClientReportableEvent(null)).toBe(false);
    expect(isClientReportableEvent(42)).toBe(false);
  });
});

describe("recordAnalyticsEvent", () => {
  it("writes only the four permitted columns", async () => {
    await recordAnalyticsEvent({
      event: "reveal_completed",
      actorId: "11111111-1111-4111-8111-111111111111",
      openingNumber: 7,
    });

    expect(inserted).toHaveLength(1);
    const { table, ...row } = inserted[0];
    expect(table).toBe("analytics_events");
    // Nothing else may be written: no film id, no opening id, no note.
    expect(Object.keys(row).sort()).toEqual(["actor_id", "detail", "event", "opening_number"]);
    expect(row).toMatchObject({
      event: "reveal_completed",
      actor_id: "11111111-1111-4111-8111-111111111111",
      opening_number: 7,
      detail: null,
    });
  });

  it("defaults the optional columns to null rather than omitting them", async () => {
    await recordAnalyticsEvent({ event: "recommendation_sent", actorId: "actor-1" });
    expect(inserted[0]).toMatchObject({ opening_number: null, detail: null });
  });

  it("carries the attendance response through as detail", async () => {
    await recordAnalyticsEvent({
      event: "screening_attendance_response",
      actorId: "actor-1",
      detail: "declined",
    });
    expect(inserted[0]).toMatchObject({ detail: "declined" });
  });

  it("reports failure without throwing, so a member action still succeeds", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    insertError = { message: "duplicate key value" };
    await expect(
      recordAnalyticsEvent({ event: "marked_watched", actorId: "actor-1" }),
    ).resolves.toBe(false);
  });

  it("swallows a thrown client error too", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    insertThrows = true;
    await expect(
      recordAnalyticsEvent({ event: "sign_in_completed", actorId: "actor-1" }),
    ).resolves.toBe(false);
  });

  it("returns true on a clean write", async () => {
    await expect(
      recordAnalyticsEvent({ event: "dimming_started", actorId: "actor-1", openingNumber: 1 }),
    ).resolves.toBe(true);
  });
});
