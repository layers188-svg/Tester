import { z } from "zod";

/**
 * Environment validation.
 *
 * Fails fast and loudly on a missing/malformed variable rather than
 * letting the app limp along with `undefined` — that is how a service
 * role key ends up in a client bundle. See docs/HOUSE_DARK_BUILD_BRIEF.md
 * §9 for the required variable list.
 */

const serverSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
  ADMIN_EMAILS: z.string().min(1),
  CRON_SECRET: z.string().min(16),
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
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
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
