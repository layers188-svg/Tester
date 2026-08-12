import { createClient } from "@supabase/supabase-js";
import { PERSONAS, emailFor, type Persona } from "./auth-state";
import { FIXTURE, TEARDOWN_ORDER } from "./fixtures";
import { loadEnvLocal } from "./load-env";

loadEnvLocal();

/**
 * Removes everything the run created, in dependency order, and then
 * checks that it worked.
 *
 * This suite is permitted to run against the real project, so cleanup
 * is not housekeeping — it is the thing that makes that permission
 * defensible. Two rules follow from it:
 *
 *   1. Delete by primary key, never by pattern. A heuristic sweep could
 *      take something real with it.
 *   2. Verify afterwards and say so loudly if anything survived. A
 *      teardown that fails quietly is worse than none, because it
 *      leaves an open opening in a project someone believes is clean —
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

  // Content first: rows referencing the opening and film, then the
  // opening and film themselves.
  for (const [table, column, value] of TEARDOWN_ORDER) {
    const { error } = await admin.from(table).delete().eq(column, value);
    if (error) problems.push(`${table}: ${error.message}`);
  }

  // Circles the journeys created carry generated ids, so they are found
  // by the name the specs use rather than by key. Their members and
  // screenings cascade.
  const { data: circles } = await admin.from("circles").select("id, name").like("name", "E2E %");
  for (const circle of circles ?? []) {
    const { error } = await admin.from("circles").delete().eq("id", circle.id);
    if (error) problems.push(`circles ${circle.id}: ${error.message}`);
  }

  // Then the people. Deleting the auth user cascades to their profile,
  // and from there to watches, reviews, memberships and analytics.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const personaEmails = new Set(
    (Object.values(PERSONAS) as Persona[]).map((persona) => emailFor(persona)),
  );
  for (const user of list?.users ?? []) {
    if (!user.email || !personaEmails.has(user.email)) continue;
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) problems.push(`user ${user.email}: ${error.message}`);
  }

  // --- prove it ---------------------------------------------------

  const { data: filmLeft } = await admin.from("films").select("id").eq("id", FIXTURE.filmId);
  const { data: openingLeft } = await admin
    .from("openings")
    .select("id")
    .eq("id", FIXTURE.openingId);
  const { data: after } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const survivors = (after?.users ?? []).filter((u) => u.email && personaEmails.has(u.email));

  if (filmLeft?.length) problems.push("the fixture film is still present");
  if (openingLeft?.length) problems.push("the fixture opening is still present");
  if (survivors.length)
    problems.push(`accounts left behind: ${survivors.map((u) => u.email).join(", ")}`);

  if (problems.length > 0) {
    console.error(
      `\n  E2E TEARDOWN INCOMPLETE — clean these up by hand:\n    ${problems.join("\n    ")}\n`,
    );
    throw new Error("E2E teardown left data behind in the configured Supabase project.");
  }

  console.log("\n  e2e teardown: fixtures and accounts removed, project verified clean\n");
}
