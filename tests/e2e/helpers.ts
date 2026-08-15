import { test, type Page } from "@playwright/test";

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

/**
 * Enter the House without the ceremony.
 *
 * `/` opens behind the projection aperture, which is a fixed overlay
 * that marks the rest of the page inert until the visitor enters. Tests
 * about the marketing pages are not about the entry — motion.spec.ts
 * covers that — so they set the same session flag a visitor sets by
 * pressing through, and land on the House directly.
 *
 * Call before `page.goto`: the flag is read on the first client render.
 */
export async function skipEntryCeremony(page: Page) {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem("hd-entry-seen", "true");
    } catch {
      // Storage unavailable — the entry will show, and the test that
      // needed this will say so rather than silently passing.
    }
  });
}
