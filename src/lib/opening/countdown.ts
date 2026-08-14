/**
 * The house opens at 7pm, local to whoever is looking.
 *
 * The countdown itself always targets a real scheduled `opens_at` from
 * the database, never a computed 7pm — counting down to a time nothing
 * is programmed for would be the house making a promise it has not
 * made. This constant is the rhythm the desk defaults to when
 * scheduling, and the line members are told when nothing is scheduled
 * yet.
 */
export const HOUSE_OPENS_HOUR = 19;

/**
 * The programme's own clock.
 *
 * Members see the countdown in their own timezone, because that is
 * when their evening is. The Desk needs a single one to default a
 * draft's hour to, since an opening's time is a property of the
 * programme rather than of wherever the owner happened to be sitting.
 */
export const HOUSE_TIMEZONE = "Australia/Melbourne";

export interface Remaining {
  hours: number;
  minutes: number;
  seconds: number;
  /** Whole days, split out of `hours` so the clock can be read at a glance. */
  days: number;
  /** True once the target has passed. */
  done: boolean;
}

export function remainingUntil(target: Date | string, now: Date = new Date()): Remaining {
  const at = typeof target === "string" ? new Date(target) : target;
  const ms = at.getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }

  const total = Math.floor(ms / 1000);
  return {
    // `hours` stays the total hours so `formatRemaining` reads the same
    // as it always did; `days` is the same number split for the segments.
    days: Math.floor(total / 86_400),
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: false,
  };
}

/**
 * The countdown as a member reads it.
 *
 * Seconds only appear inside the last minute. A clock ticking every
 * second for six hours is a hostage timer, and this is a picture house
 * telling you when it opens: hours and minutes are the honest
 * granularity until the moment is actually close.
 */
export function formatRemaining(remaining: Remaining): string {
  if (remaining.done) return "Opening now";
  if (remaining.hours > 0) {
    return `${remaining.hours}h ${String(remaining.minutes).padStart(2, "0")}m`;
  }
  if (remaining.minutes > 0) return `${remaining.minutes}m`;
  return `${remaining.seconds}s`;
}

/**
 * How often the countdown needs to redraw.
 *
 * Every second, now that the clock shows seconds. The old rule redrew
 * once a minute until the final sixty seconds, on the reasoning that a
 * phone should not be woken 21,600 times to change nothing — which was
 * right about the cost and wrong about what was on screen. A countdown
 * displaying a seconds digit that only moves once a minute is not a
 * quiet countdown, it is a broken one.
 *
 * It is one `setTimeout` rescheduling itself, and it stops when the
 * component unmounts. That is a cost worth paying for a clock that is
 * telling the truth.
 */
export function tickInterval(remaining: Remaining): number {
  return remaining.done ? 60_000 : 1_000;
}

/**
 * The countdown as four segments.
 *
 * The display form the House and Tonight both use: days, hours,
 * minutes, seconds, each zero-padded so the numbers do not jump width
 * as they change. `hours` here is hours *within* the day, unlike
 * `Remaining.hours`, which is the total.
 */
export function countdownSegments(remaining: Remaining): { value: string; unit: string }[] {
  return [
    { value: String(remaining.days).padStart(2, "0"), unit: "Days" },
    { value: String(remaining.hours % 24).padStart(2, "0"), unit: "Hours" },
    { value: String(remaining.minutes).padStart(2, "0"), unit: "Min" },
    { value: String(remaining.seconds).padStart(2, "0"), unit: "Sec" },
  ];
}

/**
 * The next 7pm in the given timezone, as an instant.
 *
 * Used by the Desk to default a new opening's time, so the daily rhythm
 * holds without anyone typing it. Timezone-correct by construction:
 * rather than guessing an offset, it asks Intl what the wall clock in
 * that zone reads for a candidate instant and steps to the next day if
 * 7pm has already gone.
 */
export function nextHouseOpening(timeZone: string, now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  // Intl renders midnight as hour 24 in some environments; both mean
  // "the day has just begun", and 0 is what the arithmetic below wants.
  const hour = get("hour") % 24;

  const dayOffset = hour >= HOUSE_OPENS_HOUR ? 1 : 0;
  const target = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + dayOffset, 12));

  // `target` is noon UTC on the right calendar day. Find what offset the
  // zone is on then, and place 19:00 wall time against it.
  const offsetMinutes = zoneOffsetMinutes(timeZone, target);
  const wallClock = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
    HOUSE_OPENS_HOUR,
    0,
    0,
  );
  return new Date(wallClock - offsetMinutes * 60_000);
}

/** Minutes that `timeZone` is ahead of UTC at the given instant. */
function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return Math.round((asUTC - at.getTime()) / 60_000);
}
