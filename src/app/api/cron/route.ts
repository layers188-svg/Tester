import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase/service";
import { processDueNotifications } from "@/lib/email/queue";

/**
 * Scheduled worker (brief §12 "Automate"). Call this on a schedule
 * (Cloudflare Cron Trigger, e.g. every 5 minutes) with:
 *   Authorization: Bearer <CRON_SECRET>
 * Every step here is safe to run more than once (brief §16 rule 5) —
 * each update is scoped to rows still in the state it expects.
 */
export async function POST(request: Request) {
  const env = getServerEnv();
  const authHeader = request.headers.get("authorization") ?? "";
  const provided = authHeader.replace(/^Bearer\s+/i, "");
  if (provided !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const now = new Date();
  const report: Record<string, number> = {};

  // 1. Open scheduled openings whose time has come.
  const { data: openedNow } = await supabase
    .from("openings")
    .update({ status: "open" })
    .eq("status", "scheduled")
    .lte("opens_at", now.toISOString())
    .select("id");
  report.openingsOpened = openedNow?.length ?? 0;

  // 2. Close open openings past their closes_at, if one is set.
  const { data: closedNow } = await supabase
    .from("openings")
    .update({ status: "closed" })
    .eq("status", "open")
    .not("closes_at", "is", null)
    .lte("closes_at", now.toISOString())
    .select("id");
  report.openingsClosed = closedNow?.length ?? 0;

  // 3. Queue the nightly opening email for members who opted in, once per newly opened opening.
  let nightlyQueued = 0;
  if (openedNow && openedNow.length > 0) {
    const { data: openingRows } = await supabase
      .from("openings")
      .select("id, opening_number")
      .in(
        "id",
        openedNow.map((o) => o.id),
      );
    const { data: optedIn } = await supabase
      .from("email_preferences")
      .select("user_id")
      .eq("nightly_opening", true);

    for (const opening of openingRows ?? []) {
      for (const member of optedIn ?? []) {
        const { count } = await supabase
          .from("notification_queue")
          .select("id", { count: "exact", head: true })
          .eq("user_id", member.user_id)
          .eq("type", "nightly_opening")
          .contains("payload", { openingNumber: opening.opening_number });
        if (!count) {
          await supabase.from("notification_queue").insert({
            user_id: member.user_id,
            type: "nightly_opening",
            send_at: now.toISOString(),
            payload: { openingNumber: opening.opening_number },
          });
          nightlyQueued += 1;
        }
      }
    }
  }
  report.nightlyEmailsQueued = nightlyQueued;

  // 4. Screening reminders for anything starting in the next two hours.
  const twoHoursOut = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const { data: upcomingScreenings } = await supabase
    .from("screenings")
    .select("id, circle_id, scheduled_for, circles(name)")
    .gte("scheduled_for", now.toISOString())
    .lte("scheduled_for", twoHoursOut);

  let remindersQueued = 0;
  for (const screening of upcomingScreenings ?? []) {
    const { data: attendees } = await supabase
      .from("screening_attendance")
      .select("user_id")
      .eq("screening_id", screening.id)
      .neq("response", "declined");

    const circleName =
      (screening.circles as unknown as { name: string } | null)?.name ?? "Your Circle";

    for (const attendee of attendees ?? []) {
      const { count } = await supabase
        .from("notification_queue")
        .select("id", { count: "exact", head: true })
        .eq("user_id", attendee.user_id)
        .eq("type", "screening_reminder")
        .contains("payload", { screeningId: screening.id });
      if (!count) {
        await supabase.from("notification_queue").insert({
          user_id: attendee.user_id,
          type: "screening_reminder",
          send_at: now.toISOString(),
          payload: {
            screeningId: screening.id,
            circleName,
            scheduledForLabel: new Date(screening.scheduled_for).toLocaleString(undefined, {
              weekday: "long",
              hour: "numeric",
              minute: "2-digit",
            }),
          },
        });
        remindersQueued += 1;
      }
    }
  }
  report.screeningRemindersQueued = remindersQueued;

  // 5. Send everything due, with capped retries.
  const sendResult = await processDueNotifications(now);
  report.emailsProcessed = sendResult.processed;
  report.emailsSent = sendResult.sent;
  report.emailsFailed = sendResult.failed;
  // Reported separately from emailsFailed (which already counts these):
  // a non-zero value means a protected title reached a queued payload,
  // which needs a person to look, not a retry.
  report.emailsBlockedBySpoilerGuard = sendResult.blockedBySpoilerGuard;

  await supabase.from("audit_log").insert({
    actor_id: null,
    action: "cron.run",
    target_type: "system",
    safe_metadata: report,
  });

  return NextResponse.json({ ok: true, report });
}
