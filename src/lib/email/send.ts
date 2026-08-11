import "server-only";

import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";
import { assertSafeEmailPayload } from "./sanitize";
import type { EmailPayload } from "./types";

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
 */
export async function sendEmail(payload: EmailPayload, forbiddenTerms: string[]): Promise<{ id: string | null }> {
  assertSafeEmailPayload(payload, forbiddenTerms);

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
