/**
 * Whether an opening is live, decided by the clock rather than by a
 * status field somebody has to remember to update.
 *
 * The cron worker flips `scheduled` to `open` at the hour, and it is
 * still the right place for the work that genuinely has to happen once
 * (queueing the nightly email, closing last night). But the product
 * cannot depend on it having run. A probe opening scheduled a minute in
 * the past sat at `scheduled` through four consecutive cron windows on
 * the deployed preview, which means that on the current deployment the
 * house would simply never have opened: members would arrive at 7pm to
 * a countdown that had already reached zero, and nothing would say why.
 *
 * `opens_at` is the fact. The status column is a cache of it. So this
 * reads the fact, and a missed cron run costs a nightly email rather
 * than the entire evening.
 *
 * `draft` and `closed` are never live whatever the clock says: a draft
 * has not been approved, and a closed opening was deliberately ended.
 */
export interface Scheduled {
  status: string;
  opensAt: string;
  closesAt: string | null;
}

export function isLive(opening: Scheduled, now: Date = new Date()): boolean {
  if (opening.status !== "open" && opening.status !== "scheduled") return false;

  const opens = new Date(opening.opensAt).getTime();
  if (!Number.isFinite(opens) || opens > now.getTime()) return false;

  if (opening.closesAt) {
    const closes = new Date(opening.closesAt).getTime();
    if (Number.isFinite(closes) && closes <= now.getTime()) return false;
  }

  return true;
}

/** Still to come: approved, and its hour has not arrived. */
export function isUpcoming(opening: Scheduled, now: Date = new Date()): boolean {
  if (opening.status !== "scheduled") return false;
  const opens = new Date(opening.opensAt).getTime();
  return Number.isFinite(opens) && opens > now.getTime();
}
