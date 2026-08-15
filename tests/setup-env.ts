/**
 * Baseline environment for unit tests.
 *
 * Unit tests import server modules directly, and `getServerEnv()` refuses
 * to hand back a half-populated environment — that refusal is deliberate
 * (a missing variable should stop the app, not produce an app that quietly
 * links members somewhere wrong). Vitest does not read `.env.local`, so
 * without this every test that renders an email or touches server config
 * would fail on configuration rather than on the behaviour it is testing.
 *
 * These values are placeholders and must stay obviously fake: no real
 * project ref, no real key, no real domain. Anything that needs a
 * specific value stubs it per-test with `vi.stubEnv` (see
 * `tests/unit/env.test.ts`), which restores to these afterwards.
 */
const defaults: Record<string, string> = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  RESEND_API_KEY: "test-resend-key",
  RESEND_FROM_EMAIL: "House Dark <house@example.com>",
  ADMIN_EMAILS: "owner@example.com",
  CRON_SECRET: "test-cron-secret-long-enough",
};

for (const [key, value] of Object.entries(defaults)) {
  // Never override a real value: `npm run test` in a configured shell
  // should exercise that configuration, not silently ignore it.
  process.env[key] ??= value;
}
