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
  /** True once the target has passed. */
  done: boolean;
}

export function remainingUntil(target: Date | string, now: Date = new Date()): Remaining {
  const at = typeof target === "string" ? new Date(target) : target;
  const ms = at.getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return { hours: 0, minutes: 0, seconds: 0, done: true };

  const total = Math.floor(ms / 1000);
  return {
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
 * Once a minute while it is showing minutes, once a second only in the
 * final minute. A one-second interval running for six hours wakes a
 * phone 21,600 times to change nothing.
 */
export function tickInterval(remaining: Remaining): number {
  if (remaining.done) return 60_000;
  return remaining.hours === 0 && remaining.minutes === 0 ? 1_000 : 60_000;
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
