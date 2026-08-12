import type { ClientReportableEvent } from "./events";

/**
 * Reports one of the three browser-observable brief §15 events.
 *
 * Fire and forget by design: analytics must never delay the ritual or
 * surface an error to a member, so a failure here is swallowed. There
 * is no queue and no retry — a lost event is strictly better than a
 * blocked dim.
 */
export function reportAnalyticsEvent(
  event: ClientReportableEvent,
  openingNumber?: number | null,
): void {
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(openingNumber == null ? { event } : { event, openingNumber }),
    keepalive: true,
  }).catch(() => {
    // Deliberately silent — see above.
  });
}
