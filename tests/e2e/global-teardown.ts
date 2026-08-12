import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import { PERSONA_IDS_FILE, PERSONAS, emailFor, type Persona } from "./auth-state";
import { FIXTURE, TEARDOWN_ORDER } from "./fixtures";
import { loadEnvLocal } from "./load-env";

loadEnvLocal();

/**
 * Removes everything the run created, then checks that it worked.
 *
 * This suite is permitted to run against the real project, so cleanup
 * is not housekeeping — it is what makes that permission defensible.
 *
 * The first version removed only what the *setup* created and left
 * everything the *journeys* created: six films and openings from the
 * Desk, the film a member typed into the send form, the storage objects
 * behind them, and eight audit-log rows. Those rows also reference the
 * owner, so deleting that account failed and it survived as well. The
 * lesson is that a teardown has to account for what the tests do, not
 * only for what it set up.
 *
 * Two rules it keeps:
 *
 *   1. Scope every delete to this suite — fixture keys, the personas'
 *      own ids, or the deliberate "E2E " title prefix. Never a bare
 *      "delete everything in this table".
 *   2. Verify afterwards and fail loudly. A teardown that fails quietly
 *      leaves an open opening in a project someone believes is clean,
 *      and an open opening is what members are shown.
 */
export default async function globalTeardown() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceKey || url.includes("localdev.supabase.co")) return;
  if (process.env.E2E_DESTRUCTIVE_OK !== "1") return;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const problems: string[] = [];
  const fail = (what: string, error: { message: string } | null) => {
    if (error) problems.push(`${what}: ${error.message}`);
  };

  // Who this suite invented. Needed first, because their ids scope the
  // deletes below.
  const personaEmails = new Set(
    (Object.values(PERSONAS) as Persona[]).map((persona) => emailFor(persona)),
  );
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const personas = (list?.users ?? []).filter((u) => u.email && personaEmails.has(u.email));
  // Union of who is still there and who the setup recorded. The
  // account-deletion journey removes its own persona mid-run, so a
  // live lookup alone cannot see every id this run created — and the
  // audit row recording that deletion survives it with a null actor,
  // matchable only by the id it targeted.
  const recorded: string[] = fs.existsSync(PERSONA_IDS_FILE)
    ? JSON.parse(fs.readFileSync(PERSONA_IDS_FILE, "utf8"))
    : [];
  const personaIds = [...new Set([...personas.map((u) => u.id), ...recorded])];

  // Rows the journeys leave pointing at those accounts. audit_log has
  // no cascade, so it is what blocks the account delete later on.
  if (personaIds.length > 0) {
    // Both directions: rows this run's accounts caused, and rows about
    // them. account.self_deleted is the second kind.
    fail("audit_log", (await admin.from("audit_log").delete().in("actor_id", personaIds)).error);
    fail(
      "audit_log (targets)",
      (await admin.from("audit_log").delete().in("target_id", personaIds)).error,
    );
    fail(
      "analytics_events",
      (await admin.from("analytics_events").delete().in("actor_id", personaIds)).error,
    );
    fail(
      "notification_queue",
      (await admin.from("notification_queue").delete().in("user_id", personaIds)).error,
    );
    fail(
      "sealed_recommendations",
      (await admin.from("sealed_recommendations").delete().in("sender_id", personaIds)).error,
    );
  }

  // The fixture opening and film, by key.
  for (const [table, column, value] of TEARDOWN_ORDER) {
    fail(table, (await admin.from(table).delete().eq(column, value)).error);
  }

  // Everything the Desk journey created. Those carry generated ids, so
  // the title prefix is the only handle — which is why that journey
  // names its films "E2E Test Film <timestamp>".
  await removeFilmsByPrefix(admin, "E2E ", problems);

  // A film a member typed into the send form is created by the RPC
  // under whatever title they chose, so no prefix finds it. Its
  // recommendations are gone above; what is left with neither an
  // opening nor a recommendation is this suite's litter.
  await removeOrphanedTestFilms(admin, problems);

  fail("circles", (await admin.from("circles").delete().like("name", "E2E %")).error);

  // Then the people. Profiles cascade to whatever remains of theirs.
  for (const user of personas) {
    fail(`profile ${user.email}`, (await admin.from("profiles").delete().eq("id", user.id)).error);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) problems.push(`user ${user.email}: ${error.message}`);
  }

  // --- prove it ---------------------------------------------------

  const { data: filmLeft } = await admin.from("films").select("id").eq("id", FIXTURE.filmId);
  const { data: openingLeft } = await admin
    .from("openings")
    .select("id")
    .eq("id", FIXTURE.openingId);
  const { data: prefixLeft } = await admin.from("films").select("id").like("title", "E2E %");
  // audit_log was missing from this list, so a surviving row was
  // reported as a clean project — the exact failure a verification step
  // exists to prevent.
  const { count: auditLeft } = await admin
    .from("audit_log")
    .select("*", { count: "exact", head: true });
  const { count: openingsLeft } = await admin
    .from("openings")
    .select("*", { count: "exact", head: true });
  const { data: after } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const survivors = (after?.users ?? []).filter((u) => u.email && personaEmails.has(u.email));

  if (filmLeft?.length) problems.push("the fixture film is still present");
  if (openingLeft?.length) problems.push("the fixture opening is still present");
  if (prefixLeft?.length) problems.push(`${prefixLeft.length} Desk-created film(s) still present`);
  if (auditLeft) problems.push(`${auditLeft} audit_log row(s) still present`);
  if (openingsLeft) problems.push(`${openingsLeft} opening(s) still present`);
  if (survivors.length) {
    problems.push(`accounts left behind: ${survivors.map((u) => u.email).join(", ")}`);
  }

  if (problems.length > 0) {
    console.error(
      `\n  E2E TEARDOWN INCOMPLETE — clean these up by hand:\n    ${problems.join("\n    ")}\n`,
    );
    throw new Error("E2E teardown left data behind in the configured Supabase project.");
  }

  console.log("\n  e2e teardown: fixtures, journey data and accounts removed, project clean\n");
}

/** A film, its opening, everything hanging off both, and its uploaded object. */
async function removeFilm(admin: SupabaseClient, filmId: string, problems: string[]) {
  const { data: secrets } = await admin
    .from("opening_secrets")
    .select("opening_id")
    .eq("film_id", filmId);

  for (const { opening_id } of secrets ?? []) {
    const { data: opening } = await admin
      .from("openings")
      .select("no_trailer_storage_path")
      .eq("id", opening_id)
      .maybeSingle();

    // Storage is covered by no cascade.
    const path = opening?.no_trailer_storage_path;
    if (path && /^[0-9a-f-]{36}\.\w+$/i.test(path)) {
      const { error } = await admin.storage.from("no-trailer").remove([path]);
      if (error) problems.push(`storage ${path}: ${error.message}`);
    }

    for (const table of ["six_word_reviews", "watches", "reveals", "opening_cues"]) {
      await admin.from(table).delete().eq("opening_id", opening_id);
    }
    await admin.from("opening_secrets").delete().eq("opening_id", opening_id);
    await admin.from("openings").delete().eq("id", opening_id);
  }

  await admin.from("playback_destinations").delete().eq("film_id", filmId);
  const { error } = await admin.from("films").delete().eq("id", filmId);
  if (error) problems.push(`film ${filmId}: ${error.message}`);
}

async function removeFilmsByPrefix(admin: SupabaseClient, prefix: string, problems: string[]) {
  const { data: films } = await admin.from("films").select("id").like("title", `${prefix}%`);
  for (const film of films ?? []) await removeFilm(admin, film.id, problems);
}

/**
 * A film with no opening and no recommendation pointing at it can only
 * be one a member's send created during this run: real programming
 * always has an opening, and this only ever runs against a project
 * already declared disposable.
 */
async function removeOrphanedTestFilms(admin: SupabaseClient, problems: string[]) {
  const { data: films } = await admin.from("films").select("id");
  for (const film of films ?? []) {
    const { count: openings } = await admin
      .from("opening_secrets")
      .select("*", { count: "exact", head: true })
      .eq("film_id", film.id);
    const { count: recommendations } = await admin
      .from("sealed_recommendations")
      .select("*", { count: "exact", head: true })
      .eq("secret_film_id", film.id);
    if ((openings ?? 0) === 0 && (recommendations ?? 0) === 0) {
      await removeFilm(admin, film.id, problems);
    }
  }
}
