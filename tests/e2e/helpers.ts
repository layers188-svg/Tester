import { test } from "@playwright/test";

/**
 * True once a real Supabase project is linked. `.env.local` in this
 * repository ships with an obviously-fake placeholder URL so the app
 * builds and the public-site tests run without one — see
 * LAUNCH_CHECKLIST.md item 1.
 */
export function hasLiveSupabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return Boolean(url) && !url.includes("localdev.supabase.co");
}

/** Call at the top of a journey that needs a real, seeded Supabase project and an authenticated session. */
export function skipWithoutLiveSupabase() {
  test.skip(
    !hasLiveSupabase(),
    "Requires a real, seeded Supabase project — see LAUNCH_CHECKLIST.md.",
  );
}
