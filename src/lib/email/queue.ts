import "server-only";

import { getServiceSupabase } from "@/lib/supabase/service";
import { TitleLeakError } from "@/lib/spoiler/detector";
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
/** Backoff before retry N, so RETRY_BACKOFF_MINUTES[0] follows the first failure. */
const RETRY_BACKOFF_MINUTES = [1, 5, 15, 60, 240];
/**
 * How long a row may sit in 'sending' before a later run assumes the
 * run that claimed it died and takes it back. Comfortably longer than
 * any real send, and shorter than the gap a member would notice.
 */
const STALE_CLAIM_MINUTES = 10;

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
  /**
   * Rows the spoiler guard refused, counted separately because they
   * mean something different from a failed send: not "the mail did not
   * go out" but "a protected title had reached a queued payload".
   * Included in `failed` as well — these are never retried.
   */
  blockedBySpoilerGuard: number;
}

/**
 * Processes due notification_queue rows. Safe to call more than once
 * (brief §16 rule 4: "Email jobs must be idempotent") — every row is
 * claimed (status -> 'sending') before it is sent, so a second
 * concurrent run skips rows already claimed.
 */
export async function processDueNotifications(now: Date = new Date()): Promise<ProcessResult> {
  const supabase = getServiceSupabase();
  const result: ProcessResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    cancelled: 0,
    blockedBySpoilerGuard: 0,
  };

  // Take back rows stranded in 'sending' by a run that died mid-send.
  // Without this they are invisible to every later run — never sent,
  // never failed, and never surfaced on the Programming Desk. The
  // attempt count is not touched here: the claim below increments it,
  // so a row that reliably kills the worker still exhausts its retries
  // rather than looping forever.
  await supabase
    .from("notification_queue")
    .update({ status: "pending" })
    .eq("status", "sending")
    .lt("updated_at", new Date(now.getTime() - STALE_CLAIM_MINUTES * 60_000).toISOString());

  const { data: due, error } = await supabase
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .lte("send_at", now.toISOString())
    .lt("attempts", MAX_ATTEMPTS)
    .order("send_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !due) return result;

  // Every title the house holds, not just the ones sealed for this
  // recipient: a queued payload has no business carrying any film title,
  // revealed or not, so the strictest list is also the simplest. The
  // guard runs against each row's `payload` — the values the template
  // is rendered from — never the rendered email itself. See
  // assertSafeEmailData for why that distinction is load-bearing.
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
      await sendEmail(rendered, { data: row.payload, forbiddenTerms: forbiddenTitles });
      await supabase
        .from("notification_queue")
        .update({ status: "sent", last_error: null })
        .eq("id", row.id);
      result.sent += 1;
    } catch (sendError) {
      const attempts = row.attempts + 1;
      const isLeak = sendError instanceof TitleLeakError;

      // A spoiler rejection is a permanent fault, not a flaky network.
      // The same payload will fail identically every time, so retrying
      // only delays the operator finding out — by which point five
      // hours of backoff have passed and the opening it belonged to is
      // over. Fail it now and make it loud.
      const isExhausted = isLeak || attempts >= MAX_ATTEMPTS;

      // Never persist a TitleLeakError's detail: last_error is readable
      // by the member this row belongs to (notification_queue_select_own,
      // 0003_rls.sql). Even the safe message is replaced with a fixed
      // string so no leak metadata reaches a member-visible column.
      const message = isLeak
        ? "Held back by the spoiler guard. See the audit log."
        : sendError instanceof Error
          ? sendError.message
          : "Unknown send error";

      // `attempts` is 1-based after the claim, so the first failure must
      // read index 0. Indexing by `attempts` skipped the first interval
      // and made every retry wait one step too long.
      const backoffMinutes =
        RETRY_BACKOFF_MINUTES[Math.min(attempts - 1, RETRY_BACKOFF_MINUTES.length - 1)];
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
      if (isLeak) result.blockedBySpoilerGuard += 1;

      await supabase.from("audit_log").insert({
        action: isLeak ? "notification.blocked_by_spoiler_guard" : "notification.send_failed",
        target_type: "notification_queue",
        target_id: row.id,
        // audit_log is owner-only (audit_log_select_owner), and the
        // owner already knows the titles they programmed — but record
        // only the offending paths, never the matched excerpt, so the
        // column stays honest to its name.
        safe_metadata: isLeak
          ? { type: row.type, attempts, exhausted: true, paths: sendError.paths }
          : { type: row.type, attempts, exhausted: isExhausted },
      });
    }
  }

  return result;
}
