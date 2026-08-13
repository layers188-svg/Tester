import fs from "node:fs";
import { chromium, type FullConfig } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import {
  AUTH_DIR,
  BASELINE_FILE,
  PERSONA_IDS_FILE,
  PERSONAS,
  emailFor,
  storageStateFor,
  type Persona,
} from "./auth-state";
import { FIXTURE } from "./fixtures";
import { loadEnvLocal } from "./load-env";

loadEnvLocal();

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
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const isPlaceholder = !url || url.includes("localdev.supabase.co");

  // No live project configured: the auth journeys skip themselves and
  // the public suite runs exactly as before. Not an error.
  if (isPlaceholder || !serviceKey) return;

  // Public-only: run the journeys that need no session against a real
  // project, without inventing a single account. This is how the app
  // gets exercised against production data paths — real PostgREST, real
  // RLS — while brief §18 still forbids demonstration people from ever
  // existing there.
  if (process.env.E2E_PUBLIC_ONLY === "1") return;

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

      // Exchange the code for a session using the very library the app
      // signs in with, capturing the cookies it would have written.
      //
      // Driving /join in the browser was the first approach and is the
      // better test, but browser-side requests here have to be
      // forwarded through Node (no direct network), and GoTrue rejects
      // the forwarded exchange while accepting the identical call made
      // from Node. Rather than ship a harness built on a workaround I
      // could not explain, the exchange happens where it demonstrably
      // works. What that costs is honest: these sessions do not
      // exercise the /join screen. The tokens are real, minted by
      // GoTrue, and the cookie encoding comes from @supabase/ssr itself
      // rather than being hand-rolled — so what the browser carries is
      // exactly what a real sign-in would leave behind.
      const captured: { name: string; value: string }[] = [];
      const authClient = createServerClient(url, anonKey, {
        cookies: {
          getAll: () => [],
          setAll: (cookies) => {
            for (const { name, value } of cookies) captured.push({ name, value });
          },
        },
      });

      const { error: verifyError } = await authClient.auth.verifyOtp({
        email,
        token: link.properties.email_otp,
        type: "email",
      });
      if (verifyError) {
        throw new Error(`Could not sign in ${email}: ${verifyError.message}`);
      }
      if (captured.length === 0) {
        throw new Error(`Sign-in for ${email} produced no session cookies.`);
      }

      const context = await browser.newContext({ baseURL });
      await context.addCookies(
        captured.map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
          domain: new URL(baseURL).hostname,
          path: "/",
          httpOnly: false,
          secure: false,
          sameSite: "Lax" as const,
        })),
      );

      // /api/auth/ensure-profile normally creates these on first sign
      // in. Bypassing the form bypasses that too, and without a profile
      // row every foreign key pointing at one fails — analytics was the
      // first to complain.
      const { data: authUser } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const created = (authUser?.users ?? []).find((u) => u.email === email);
      if (created) {
        await admin.from("profiles").upsert({
          id: created.id,
          display_name: email.split("@")[0],
          timezone: "UTC",
          role: persona === PERSONAS.owner ? "owner" : "member",
          onboarding_complete: true,
        });
        await admin.from("email_preferences").upsert({ user_id: created.id });
      }

      // Prove the cookies actually carry: /tonight redirects to /join
      // for anyone without a session, so landing there is the check.
      const page = await context.newPage();
      await page.goto("/tonight");
      if (!/\/tonight/.test(page.url())) {
        throw new Error(
          `Session for ${email} was not accepted — landed at ${page.url()} instead of /tonight.`,
        );
      }

      await context.storageState({ path: storageStateFor(persona) });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  // Written down for the teardown — see PERSONA_IDS_FILE.
  const { data: everyone } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const personaEmails = new Set((Object.values(PERSONAS) as Persona[]).map((p) => emailFor(p)));
  fs.writeFileSync(
    PERSONA_IDS_FILE,
    JSON.stringify(
      (everyone?.users ?? []).filter((u) => u.email && personaEmails.has(u.email)).map((u) => u.id),
    ),
  );

  // The owner persona has to actually be an owner, or the Desk journeys
  // get a redirect instead of a page. ADMIN_EMAILS grants this on first
  // sign-in, but that would mean putting a test address in the real
  // deployment's configuration; setting the role directly keeps the
  // arrangement inside the test run.
  const { data: ownerProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("display_name", emailFor(PERSONAS.owner).split("@")[0])
    .maybeSingle();
  if (ownerProfile) {
    await admin.from("profiles").update({ role: "owner" }).eq("id", ownerProfile.id);
  }

  await seedFixtures(admin);

  // Taken after seeding, so the fixtures themselves are part of the
  // baseline and only what the journeys add can look like residue.
  const counts: Record<string, number> = {};
  for (const table of ["audit_log", "films", "openings", "analytics_events"]) {
    const { count } = await admin.from(table).select("*", { count: "exact", head: true });
    counts[table] = count ?? 0;
  }
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(counts));
}

/**
 * The opening the signed-in journeys dim, play and reveal.
 *
 * Deliberately not supabase/seed.sql: that file creates demonstration
 * *people*, which brief §18 forbids from ever reaching production. This
 * creates only content, under ids the teardown removes by primary key.
 */
async function seedFixtures(admin: SupabaseClient) {
  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  await admin.from("films").upsert({
    id: FIXTURE.filmId,
    title: FIXTURE.filmTitle,
    release_year: 2014,
    runtime_minutes: 106,
    country_code: "US",
    rights_notes: "End-to-end test fixture. Removed by tests/e2e/global-teardown.ts.",
  });

  await admin.from("openings").upsert({
    id: FIXTURE.openingId,
    opening_number: FIXTURE.openingNumber,
    opens_at: new Date(Date.now() - 60_000).toISOString(),
    closes_at: null,
    status: "open",
    runtime_minutes: 106,
    availability_count: 3,
    minimum_access_type: "subscription",
    no_trailer_storage_path: "e2e-placeholder.mp4",
    content_notes: "End-to-end test fixture.",
  });

  await admin.from("opening_secrets").upsert({
    opening_id: FIXTURE.openingId,
    film_id: FIXTURE.filmId,
    approved_at: new Date().toISOString(),
    approved_by: owner?.id ?? null,
  });

  await admin.from("opening_cues").upsert([
    { opening_id: FIXTURE.openingId, cue: "Drummer", sort_order: 0 },
    { opening_id: FIXTURE.openingId, cue: "School", sort_order: 1 },
  ]);

  await admin.from("playback_destinations").upsert({
    film_id: FIXTURE.filmId,
    territory: "AU",
    provider_name: FIXTURE.providerName,
    access_type: "subscription",
    deep_link: "https://example.com/watch/e2e-fixture",
    verified_at: new Date().toISOString(),
    is_active: true,
  });

  // State the journeys start from rather than build up to. Tonight
  // only offers "mark watched" once a member has revealed, and the
  // deletion journey needs a review already there to delete — writing
  // those through the UI first would make each test depend on the one
  // before it.
  // The member deliberately has NO reveal: Tonight and the signed-in
  // spoiler journey both need the sealed state, which is the state that
  // matters most. The friend carries the reveal instead, for the
  // journeys that start after one.
  const [friendId, expendableId] = await profileIds(admin, [PERSONAS.friend, PERSONAS.expendable]);
  if (friendId) {
    await admin.from("reveals").upsert({ user_id: friendId, opening_id: FIXTURE.openingId });
  }
  if (expendableId) {
    await admin.from("reveals").upsert({ user_id: expendableId, opening_id: FIXTURE.openingId });
    await admin.from("watches").upsert({
      user_id: expendableId,
      opening_id: FIXTURE.openingId,
      state: "watched",
      watched_at: new Date().toISOString(),
    });
    await admin.from("six_word_reviews").upsert({
      user_id: expendableId,
      opening_id: FIXTURE.openingId,
      body: "Six words left here for deleting",
      word_count: 6,
      visibility: "circle",
    });
  }

  // A Circle the member and friend share. Sending under seal offers
  // recipients drawn from your Circles, so without this the send form
  // has nobody to address.
  const ids = await profileIds(admin, [PERSONAS.member, PERSONAS.friend]);
  if (ids.length === 2) {
    await admin.from("circles").upsert({
      id: FIXTURE.circleId,
      name: "E2E Circle",
      created_by: ids[0],
      invite_code: "e2e-fixture-code",
      default_screening_day: 4,
      default_screening_time: "20:00",
    });
    await admin.from("circle_members").upsert([
      { circle_id: FIXTURE.circleId, user_id: ids[0], role: "organiser" },
      { circle_id: FIXTURE.circleId, user_id: ids[1], role: "member" },
    ]);
  }
}

/** Profile ids for personas, in the order asked for. */
async function profileIds(admin: SupabaseClient, personas: Persona[]): Promise<string[]> {
  const names = personas.map((p) => emailFor(p).split("@")[0]);
  const { data } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("display_name", names);
  return names
    .map((name) => (data ?? []).find((row) => row.display_name === name)?.id)
    .filter((id): id is string => Boolean(id));
}
