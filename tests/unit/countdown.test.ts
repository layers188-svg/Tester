import { describe, expect, it } from "vitest";
import {
  HOUSE_OPENS_HOUR,
  countdownSegments,
  formatRemaining,
  nextHouseOpening,
  remainingUntil,
  tickInterval,
} from "@/lib/opening/countdown";

const at = (iso: string) => new Date(iso);

describe("remainingUntil", () => {
  it("breaks the gap into hours, minutes and seconds", () => {
    const r = remainingUntil(at("2026-08-14T19:00:00Z"), at("2026-08-14T16:12:35Z"));
    expect(r).toEqual({ days: 0, hours: 2, minutes: 47, seconds: 25, done: false });
  });

  it("is done once the target has passed", () => {
    expect(remainingUntil(at("2026-08-14T19:00:00Z"), at("2026-08-14T19:00:01Z")).done).toBe(true);
  });

  it("is done exactly on the target rather than a moment after", () => {
    expect(remainingUntil(at("2026-08-14T19:00:00Z"), at("2026-08-14T19:00:00Z")).done).toBe(true);
  });

  /** A malformed opens_at must not render "NaNh NaNm" to a member. */
  it("treats an unparseable time as done rather than as NaN", () => {
    expect(remainingUntil("not a date").done).toBe(true);
  });
});

describe("formatRemaining", () => {
  it("pads the minutes so the line does not jump width", () => {
    expect(formatRemaining({ days: 0, hours: 3, minutes: 5, seconds: 0, done: false })).toBe(
      "3h 05m",
    );
  });

  it("drops the hours once there are none", () => {
    expect(formatRemaining({ days: 0, hours: 0, minutes: 12, seconds: 30, done: false })).toBe(
      "12m",
    );
  });

  /** Seconds only inside the last minute: see the note in countdown.ts. */
  it("shows seconds only in the final minute", () => {
    expect(formatRemaining({ days: 0, hours: 0, minutes: 0, seconds: 42, done: false })).toBe(
      "42s",
    );
  });

  it("says what is happening rather than showing zero", () => {
    expect(formatRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true })).toBe(
      "Opening now",
    );
  });
});

describe("tickInterval", () => {
  it("redraws every second, because the clock shows seconds", () => {
    // The old rule redrew once a minute until the final sixty seconds,
    // to avoid waking a phone 21,600 times to change nothing. That was
    // right about the cost and wrong about what was on screen: a
    // countdown with a seconds digit that only moves once a minute is
    // not a quiet countdown, it is a broken one.
    expect(tickInterval({ days: 0, hours: 2, minutes: 3, seconds: 4, done: false })).toBe(1_000);
    expect(tickInterval({ days: 0, hours: 0, minutes: 3, seconds: 4, done: false })).toBe(1_000);
    expect(tickInterval({ days: 0, hours: 0, minutes: 0, seconds: 40, done: false })).toBe(1_000);
  });

  it("stops hurrying once the moment has passed", () => {
    expect(tickInterval({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true })).toBe(60_000);
  });
});

describe("countdownSegments", () => {
  it("splits total hours into days and hours within the day", () => {
    // `remaining.hours` is the total, which is what formatRemaining
    // reads. The segments show a member 01 : 04, not 28 hours.
    const segments = countdownSegments({
      days: 1,
      hours: 28,
      minutes: 9,
      seconds: 5,
      done: false,
    });
    expect(segments.map((s) => s.value)).toEqual(["01", "04", "09", "05"]);
    expect(segments.map((s) => s.unit)).toEqual(["Days", "Hours", "Min", "Sec"]);
  });

  it("pads so the numbers do not change width as they tick", () => {
    const segments = countdownSegments({ days: 0, hours: 0, minutes: 0, seconds: 7, done: false });
    expect(segments.every((s) => s.value.length === 2)).toBe(true);
  });
});

describe("nextHouseOpening", () => {
  /**
   * The offset arithmetic is the part worth testing. Melbourne is
   * UTC+10 in August (no daylight saving), so 7pm local is 09:00Z.
   */
  it("finds today's 7pm when the evening has not arrived", () => {
    const next = nextHouseOpening("Australia/Melbourne", at("2026-08-14T02:00:00Z"));
    expect(next.toISOString()).toBe("2026-08-14T09:00:00.000Z");
  });

  it("rolls to tomorrow once 7pm has gone", () => {
    // 09:30Z is 7:30pm in Melbourne: tonight's has started.
    const next = nextHouseOpening("Australia/Melbourne", at("2026-08-14T09:30:00Z"));
    expect(next.toISOString()).toBe("2026-08-15T09:00:00.000Z");
  });

  it("gives each timezone its own evening", () => {
    const melbourne = nextHouseOpening("Australia/Melbourne", at("2026-08-14T02:00:00Z"));
    const london = nextHouseOpening("Europe/London", at("2026-08-14T02:00:00Z"));
    expect(melbourne.toISOString()).not.toBe(london.toISOString());
    // London is UTC+1 in August.
    expect(london.toISOString()).toBe("2026-08-14T18:00:00.000Z");
  });

  /**
   * A zone whose offset is not a whole number of hours, which is where
   * naive hour arithmetic goes wrong.
   */
  it("handles a half-hour offset", () => {
    const next = nextHouseOpening("Asia/Kolkata", at("2026-08-14T02:00:00Z"));
    expect(next.toISOString()).toBe("2026-08-14T13:30:00.000Z");
  });

  it("lands on the house hour in the zone's own clock", () => {
    for (const zone of ["Australia/Melbourne", "Europe/London", "America/New_York", "UTC"]) {
      const next = nextHouseOpening(zone, at("2026-08-14T02:00:00Z"));
      const hour = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hour12: false,
        hour: "2-digit",
      }).format(next);
      expect(Number(hour) % 24).toBe(HOUSE_OPENS_HOUR);
    }
  });
});
