import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service";
import { sendEmail } from "./send";
import {
  afterCreditsEmail,
  nightlyOpeningEmail,
  screeningReminderEmail,
  sealedRecommendationEmail,
} from "./templates";
import type { NotificationType } from "./types";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;
/** Exponential backoff in minutes, indexed by attempt count. */
const RETRY_BACKOFF_MINUTES = [1, 5, 15, 60, 240];

interface EnqueueArgs {
  userId: string;
  type: NotificationType;
  sendAt?: Date;
  payload: Record<string, unknown>;
}

/** Inserts a queue row, respecting the member's email_preferences opt-out for that type. */
export async function enqueueNotification({
  userId,
  type,
  sendAt = new Date(),
  payload,
}: EnqueueArgs): Promise<void> {
  const supabase = getServiceSupabase();

  const { data: prefs } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const prefKey: Record<NotificationType, keyof NonNullable<typeof prefs> | null> = {
    nightly_opening: "nightly_opening",
    sealed_recommendation: "sealed_recommendations",
    screening_reminder: "screening_reminders",
    after_credits: "after_credits",
    editorial_edm: "editorial_edm",
  };

  const key = prefKey[type];
  if (prefs && key && prefs[key] === false) {
    return; // member opted out — not an error, just nothing to send.
  }

  const { data: userResult } = await supabase.auth.admin.getUserById(userId);
  const email = userResult?.user?.email;
  if (!email) return;

  await supabase.from("notification_queue").insert({
    user_id: userId,
    type,
    send_at: sendAt.toISOString(),
    payload: { ...payload, to: email },
  });
}

function renderPayload(type: NotificationType, payload: Record<string, unknown>) {
  const to = String(payload.to ?? "");
  switch (type) {
    case "nightly_opening":
      return nightlyOpeningEmail({ to, openingNumber: Number(payload.openingNumber) });
    case "sealed_recommendation":
      return sealedRecommendationEmail({
        to,
        senderDisplayName: String(payload.senderDisplayName ?? "A friend"),
      });
    case "screening_reminder":
      return screeningReminderEmail({
        to,
        circleName: String(payload.circleName ?? "Your Circle"),
        scheduledForLabel: String(payload.scheduledForLabel ?? "soon"),
      });
    case "after_credits":
      return afterCreditsEmail({ to });
    case "editorial_edm":
      throw new Error(
        "Editorial email must be composed and sent explicitly, not via the automatic queue.",
      );
  }
}

export interface ProcessResult {
  processed: number;
  sent: number;
  failed: number;
  cancelled: number;
}

/**
 * Processes due notification_queue rows. Safe to call more than once
 * (brief §16 rule 4: "Email jobs must be idempotent") — every row is
 * claimed (status -> 'sending') before it is sent, so a second
 * concurrent run skips rows already claimed.
 */
export async function processDueNotifications(now: Date = new Date()): Promise<ProcessResult> {
  const supabase = getServiceSupabase();
  const result: ProcessResult = { processed: 0, sent: 0, failed: 0, cancelled: 0 };

  const { data: due, error } = await supabase
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", now.toISOString())
    .lt("attempts", MAX_ATTEMPTS)
    .order("send_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !due) return result;

  const { data: films } = await supabase.from("films").select("title");
  const forbiddenTitles = (films ?? []).map((f) => f.title);

  for (const row of due) {
    result.processed += 1;

    const claim = await supabase
      .from("notification_queue")
      .update({ status: "sending", attempts: row.attempts + 1 })
      .eq("id", row.id)
      .eq("status", "pending") // only claim if still pending — guards concurrent runs
      .select("id")
      .maybeSingle();

    if (!claim.data) continue; // another run claimed it first

    try {
      const rendered = renderPayload(
        row.type as NotificationType,
        row.payload as Record<string, unknown>,
      );
      await sendEmail(rendered, forbiddenTitles);
      await supabase
        .from("notification_queue")
        .update({ status: "sent", last_error: null })
        .eq("id", row.id);
      result.sent += 1;
    } catch (sendError) {
      const attempts = row.attempts + 1;
      const isExhausted = attempts >= MAX_ATTEMPTS;
      const message = sendError instanceof Error ? sendError.message : "Unknown send error";
      const backoffMinutes =
        RETRY_BACKOFF_MINUTES[Math.min(attempts, RETRY_BACKOFF_MINUTES.length - 1)];
      const nextSendAt = new Date(now.getTime() + backoffMinutes * 60_000);

      await supabase
        .from("notification_queue")
        .update({
          status: isExhausted ? "failed" : "pending",
          last_error: message.slice(0, 500),
          send_at: isExhausted ? row.send_at : nextSendAt.toISOString(),
        })
        .eq("id", row.id);

      if (isExhausted) result.failed += 1;

      await supabase.from("audit_log").insert({
        action: "notification.send_failed",
        target_type: "notification_queue",
        target_id: row.id,
        safe_metadata: { type: row.type, attempts, exhausted: isExhausted },
      });
    }
  }

  return result;
}
