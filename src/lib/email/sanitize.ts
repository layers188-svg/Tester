import { assertNoTitleLeak } from "@/lib/spoiler/detector";
import type { EmailPayload } from "./types";

/**
 * Brief §13: "No operational email may carry the title before reveal."
 * Every send path must call this immediately before handing the
 * payload to Resend. `forbiddenTerms` is normally every film title
 * currently sealed for the recipient (unrevealed openings + unrevealed
 * sealed recommendations) — see src/lib/email/send.ts.
 */
export function assertSafeEmailPayload(payload: EmailPayload, forbiddenTerms: string[]): void {
  assertNoTitleLeak(
    {
      subject: payload.subject,
      previewText: payload.previewText,
      html: payload.html,
      text: payload.text,
      tags: payload.tags,
    },
    forbiddenTerms,
    `email payload to ${payload.to.replace(/(?<=.).(?=[^@]*@)/g, "*")}`,
  );
}
