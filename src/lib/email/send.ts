import "server-only";

import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";
import { assertSafeEmailData, redactEmail } from "./sanitize";
import type { EmailPayload } from "./types";

/**
 * The dynamic values this email was rendered from, plus the titles that
 * must not appear in them. Required on every send so the guard cannot
 * be forgotten at a call site.
 */
export interface SendGuard {
  /** The template inputs — e.g. the notification queue row's payload. */
  data: unknown;
  /** Titles currently protected. Empty means "nothing to protect yet". */
  forbiddenTerms: string[];
}

let resendClient: Resend | undefined;

function getResend(): Resend {
  if (resendClient) return resendClient;
  resendClient = new Resend(getServerEnv().RESEND_API_KEY);
  return resendClient;
}

/**
 * The only function in the codebase that should call the Resend API
 * directly. Always sanitises immediately before sending — brief §11
 * rule 9 requires an automated check on "outgoing email payloads", and
 * this is where that check runs on the live path, not just in tests.
 *
 * The guard inspects `guard.data` (the template inputs) rather than the
 * rendered payload, because the rendered payload is mostly constant
 * chrome that a title cannot reach at runtime but that short titles
 * collide with — see `assertSafeEmailData` for the full reasoning.
 */
export async function sendEmail(
  payload: EmailPayload,
  guard: SendGuard,
): Promise<{ id: string | null }> {
  assertSafeEmailData(
    guard.data,
    guard.forbiddenTerms,
    `notification data for ${redactEmail(payload.to)}`,
  );

  const env = getServerEnv();
  const { data, error } = await getResend().emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    tags: payload.tags
      ? Object.entries(payload.tags).map(([name, value]) => ({ name, value }))
      : undefined,
  });

  if (error) {
    // Never log the payload body — only Resend's own safe error shape.
    throw new Error(`Resend send failed: ${error.message}`);
  }
  return { id: data?.id ?? null };
}
