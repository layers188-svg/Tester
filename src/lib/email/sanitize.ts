import { assertNoTitleLeak } from "@/lib/spoiler/detector";
import type { EmailPayload } from "./types";

/**
 * Brief §13: "No operational email may carry the title before reveal."
 *
 * There are two guards here because they answer two different
 * questions, and using the wrong one on the live send path took the
 * whole notification queue down for short titles.
 *
 * A rendered email is `template(constant copy, dynamic data)`. The
 * constant copy — doctype, viewport meta, inline CSS, the "House Dark"
 * wordmark, the body prose — is authored in this repo and reviewed;
 * it cannot acquire tonight's film title at runtime. Only the dynamic
 * data can carry one. So the live path guards the data, and the
 * regression suite guards the rendered output.
 */

/**
 * The live-path guard. Scans the dynamic values a notification was
 * built from — the queue row's payload — never the rendered chrome.
 *
 * Scanning rendered output here is unsound, not merely noisy. Titles
 * are matched case-insensitively, so a film called *It* hits
 * `initial-scale` in the viewport meta, *Up* hits
 * `text-transform:uppercase`, and *Us* hits the "us" in
 * `<title>House Dark</title>`. Every one of those is a real film a
 * picture house would program, and each would have failed every
 * operational email in the product — including the nightly opening,
 * the core loop — through five retries and into `failed`, silently.
 *
 * Word boundaries are required as well, so a title only trips this on
 * a real word rather than inside a longer one.
 */
export function assertSafeEmailData(
  data: unknown,
  forbiddenTerms: string[],
  context: string,
): void {
  assertNoTitleLeak(data, forbiddenTerms, context, { wholeWord: true });
}

/**
 * The regression guard. Scans a fully rendered payload with the
 * aggressive substring match, which is the right behaviour for a test:
 * over-triggering costs a red build, under-triggering ships a spoiler.
 *
 * Not for the live send path — see `assertSafeEmailData`. Callers pass
 * distinctive titles (the seed uses "Whiplash") so the substring match
 * has no chrome to collide with.
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
    `email payload to ${redactEmail(payload.to)}`,
  );
}

/** Never put a full member address in an error message or log line (brief §14). */
export function redactEmail(address: string): string {
  return address.replace(/(?<=.).(?=[^@]*@)/g, "*");
}
