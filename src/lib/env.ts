import { z } from "zod";

/**
 * Environment validation.
 *
 * Fails fast and loudly on a missing/malformed variable rather than
 * letting the app limp along with `undefined` — that is how a service
 * role key ends up in a client bundle. See docs/HOUSE_DARK_BUILD_BRIEF.md
 * §9 for the required variable list.
 */

/**
 * A sender address in either form Resend accepts: a bare
 * `hello@example.com`, or `House Dark <hello@example.com>`. The second
 * is what members actually see in an inbox, and it is the shape
 * `.env.example` hands out — a plain `z.string().email()` rejects it,
 * so following the documented setup would stop the app booting.
 */
export function parseSenderAddress(value: string): string | null {
  const named = /^[^<>]*<([^<>]+)>$/.exec(value.trim());
  const address = (named ? named[1] : value).trim();
  return z.string().email().safeParse(address).success ? address : null;
}

const senderEmail = z.string().refine((value) => parseSenderAddress(value) !== null, {
  message: 'must be an email address, optionally as "House Dark <hello@example.com>"',
});

const serverSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: senderEmail,
  ADMIN_EMAILS: z.string().min(1),
  CRON_SECRET: z.string().min(16),

  /**
   * TESTING ONLY — the key that unlocks the sign-in bypass. Absent in a
   * normal deployment, and the bypass does not exist without it.
   *
   * It exists because no sign-in code can currently be delivered at
   * all: Supabase's free tier rate-limits its built-in email to a
   * couple of messages an hour (`429 over_email_send_rate_limit`) and
   * refuses to edit the Magic Link template while that provider is in
   * use, so the email carries a link rather than the six-digit
   * `{{ .Token }}` the form asks for. `signInWithOtp` throws on the
   * 429, stranding the form on its first step — the code screen could
   * not be reached even with a valid code in hand.
   *
   * Deliberately NOT `NEXT_PUBLIC_`. The key never enters the client
   * bundle; `/join` decides whether to offer the bypass from a `?k=`
   * query parameter, and `/api/test-signin` is what actually checks the
   * value. So a visitor with no link sees an ordinary join page with no
   * bypass, no banner, and nothing advertising that either exists —
   * which is what the 13 August review calls for under launch safety.
   *
   * It is still an authentication bypass for whoever holds the link:
   * they can sign in as any address, including one in ADMIN_EMAILS,
   * which carries the Programming Desk and protected title data.
   * Tolerable only while the project holds no real members. Remove it
   * when custom SMTP lands — LAUNCH_CHECKLIST item 2.
   */
  TEST_SIGNIN_KEY: z.string().min(16).optional(),
});

const clientSchema = serverSchema.pick({
  NEXT_PUBLIC_APP_URL: true,
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

let cachedServerEnv: ServerEnv | undefined;

/**
 * Server-only accessor. Throws with a precise, actionable message rather
 * than a generic "invalid env" — this is what Logan sees when a variable
 * is missing, so it must name the exact variable.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must not be called from the browser.");
  }
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(
      `House Dark cannot start: missing or invalid environment variable(s): ${missing}. ` +
        "See .env.example.",
    );
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

let cachedClientEnv: ClientEnv | undefined;

/** Safe to import from client components — only ever exposes NEXT_PUBLIC_* values. */
export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv;
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`House Dark client is misconfigured: missing ${missing}.`);
  }
  cachedClientEnv = parsed.data;
  return cachedClientEnv;
}

/** Returns the lowercase owner allowlist from ADMIN_EMAILS ("a@x.com,b@y.com"). */
export function getAdminEmails(): string[] {
  return getServerEnv()
    .ADMIN_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
