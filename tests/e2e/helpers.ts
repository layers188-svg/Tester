import fs from "node:fs";
import { test } from "@playwright/test";
import { PERSONAS, storageStateFor, type Persona } from "./auth-state";
import { loadEnvLocal } from "./load-env";

loadEnvLocal();

/**
 * True once a real Supabase project is linked. `.env.local` ships with
 * an obviously-fake placeholder URL so the app builds and the
 * public-site tests run without one — see LAUNCH_CHECKLIST.md item 1.
 */
export function hasLiveSupabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return Boolean(url) && !url.includes("localdev.supabase.co");
}

/**
 * True once tests/e2e/global-setup.ts has actually minted sessions.
 *
 * A live project is not enough on its own: E2E_PUBLIC_ONLY=1 runs the
 * no-session journeys against a real project without creating a single
 * account, and in that mode these files must still skip.
 */
export function hasSessions(): boolean {
  return (
    hasLiveSupabase() &&
    process.env.E2E_PUBLIC_ONLY !== "1" &&
    fs.existsSync(storageStateFor(PERSONAS.member))
  );
}

/** Call at the top of a journey that needs a real, seeded Supabase project and an authenticated session. */
export function skipWithoutLiveSupabase() {
  test.skip(
    !hasSessions(),
    "Requires a live Supabase project and a minted session — see LAUNCH_CHECKLIST.md.",
  );
}

/**
 * Runs the enclosing describe block as one of the seeded personas.
 *
 * Playwright resolves `test.use` before the setup has necessarily run,
 * so the path is handed over unconditionally; the skip above is what
 * keeps a file from running when no state exists behind it.
 */
export function signedInAs(persona: Persona) {
  test.use({ storageState: storageStateFor(persona) });
}
