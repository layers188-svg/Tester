import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service";
import type { AnalyticsDetail, AnalyticsEvent } from "./events";

/**
 * Records one brief §15 event.
 *
 * Note what this function cannot be asked to store: there is no free
 * text parameter. The event name and the detail are closed unions, the
 * opening number is an integer, and the actor is a uuid. A film title,
 * a provider URL, a note or a review body has no parameter to travel
 * in — §15's prohibitions are enforced by the type signature and by the
 * table's shape, not by a scan that has to be remembered.
 *
 * Writes go through the service role because `analytics_events` has no
 * insert policy: members must not be able to forge house
 * instrumentation by posting to PostgREST directly.
 */
export type AnalyticsRecord = {
  event: AnalyticsEvent;
  actorId: string;
  /** openings.opening_number — the opaque public number, never the uuid. */
  openingNumber?: number | null;
  detail?: AnalyticsDetail | null;
};

/**
 * Never throws and never blocks the member's action. Analytics is the
 * least important thing happening on any of these paths: a failed
 * insert must not turn a successful reveal into an error, so this
 * returns a boolean for tests rather than propagating.
 */
export async function recordAnalyticsEvent(entry: AnalyticsRecord): Promise<boolean> {
  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from("analytics_events").insert({
      event: entry.event,
      actor_id: entry.actorId,
      opening_number: entry.openingNumber ?? null,
      detail: entry.detail ?? null,
    });
    if (error) {
      // The message is Postgres's own and cannot contain a title —
      // nothing title-shaped is ever passed in. Still safe to log.
      console.warn(`analytics: could not record ${entry.event}: ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      `analytics: could not record ${entry.event}: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    return false;
  }
}
