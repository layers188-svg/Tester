import fs from "node:fs";
import { chromium, type FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { AUTH_DIR, PERSONAS, emailFor, storageStateFor, type Persona } from "./auth-state";

/**
 * Mints a real signed-in session for each persona, so the journeys that
 * need one can stop skipping (brief §17).
 *
 * It signs in the way a member does rather than forging a cookie: ask
 * the admin API for the one time code that would have been emailed,
 * then type it into the real /join form. The session that results is
 * produced by the app's own auth path, cookies and all — so these tests
 * exercise sign-in instead of assuming it.
 *
 * ---
 *
 * SAFETY: this creates accounts and signs them in. It refuses to run
 * unless E2E_DESTRUCTIVE_OK=1 says the project is disposable. Brief §18
 * forbids demonstration people from ever reaching production, and a
 * suite that quietly invented members in Logan's real project would be
 * exactly that. Point this at a throwaway Supabase project or a local
 * stack, never at the live one.
 */
export default async function globalSetup(config: FullConfig) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const isPlaceholder = !url || url.includes("localdev.supabase.co");

  // No live project configured: the auth journeys skip themselves and
  // the public suite runs exactly as before. Not an error.
  if (isPlaceholder || !serviceKey) return;

  if (process.env.E2E_DESTRUCTIVE_OK !== "1") {
    throw new Error(
      "A live Supabase project is configured but E2E_DESTRUCTIVE_OK is not set to 1.\n" +
        "This setup creates member accounts and signs them in, which must never happen\n" +
        "against the real project (brief §18). Point NEXT_PUBLIC_SUPABASE_URL at a\n" +
        "throwaway project and set E2E_DESTRUCTIVE_OK=1 to confirm it is disposable.",
    );
  }

  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3100";
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const browser = await chromium.launch();

  try {
    for (const persona of Object.values(PERSONAS) as Persona[]) {
      const email = emailFor(persona);

      // Idempotent: a rerun reuses the account rather than failing on a
      // duplicate. An existing address returns an error we can ignore.
      const { error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      if (createError && !/already|exists|registered/i.test(createError.message)) {
        throw new Error(`Could not create ${email}: ${createError.message}`);
      }

      // The code that would have been emailed. Nothing is actually sent.
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (linkError || !link?.properties?.email_otp) {
        throw new Error(
          `Could not mint a code for ${email}: ${linkError?.message ?? "no email_otp returned"}`,
        );
      }

      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();

      await page.goto("/join");
      await page.getByLabel("Email").fill(email);
      await page.getByRole("button", { name: /send my code/i }).click();

      await page.getByLabel(/six digit code/i).fill(link.properties.email_otp);
      await page.getByRole("button", { name: /enter house dark/i }).click();

      // Landing on Tonight is the proof the session took: /tonight
      // redirects to /join for anyone without one.
      await page.waitForURL(/\/tonight/, { timeout: 20_000 });

      await context.storageState({ path: storageStateFor(persona) });
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
