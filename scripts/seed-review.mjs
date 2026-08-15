/**
 * Review fixture: makes Circle and Library "Yours" walkable.
 *
 * The preview account had no Circle, no sealed recommendation and no
 * Library entries, so two of the six screens a reviewer is asked to
 * look at were empty states. This creates the smallest amount of real
 * data that exercises the real backend: one second account, one Circle
 * with both members in it, one film sent under seal, and two Library
 * entries.
 *
 * On the second account's name: it is "Second member (preview)", not a
 * person. CLAUDE.md rule 5 forbids generating people or social proof,
 * and a plausible human name in a demo is exactly that. Nothing here
 * fabricates a six-word review either — the seal on the recommendation
 * is what the reviewer needs to see, and inventing someone's words to
 * decorate the Circle page would be inventing someone.
 *
 * Everything it writes is tagged so `--clean` can find it again.
 *
 *   node scripts/seed-review.mjs
 *   node scripts/seed-review.mjs --clean
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const MARKER = "Review fixture — scripts/seed-review.mjs";
const FIXTURE_EMAIL = "preview-second@housedark.test";
const CIRCLE_NAME = "Preview Circle";
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "layers188@gmail.com";
/** library_entries has no notes column to tag, so the titles are the handle. */
const LIBRARY_TITLES = ["Burning", "In the Mood for Love"];

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Fails loudly. A seed that reports success while writing nothing is worse than one that crashes. */
function must(label, { error }) {
  if (error) {
    console.error(`  ✗ ${label}: ${error.message ?? JSON.stringify(error)}`);
    process.exit(1);
  }
  console.log(`  ✓ ${label}`);
}

async function findUserByEmail(email) {
  // listUsers is paginated; the preview project has a handful of accounts.
  const { data, error } = await db.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(error.message);
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function clean() {
  console.log("Removing the review fixture…");

  const { data: circles } = await db.from("circles").select("id").eq("name", CIRCLE_NAME);
  for (const circle of circles ?? []) {
    must(`circle ${circle.id}`, await db.from("circles").delete().eq("id", circle.id));
  }

  const { data: films } = await db.from("films").select("id").ilike("rights_notes", `${MARKER}%`);
  for (const film of films ?? []) {
    // Recommendations reference the film, so they go first.
    must(
      `recommendations for film ${film.id}`,
      await db.from("sealed_recommendations").delete().eq("secret_film_id", film.id),
    );
    must(`film ${film.id}`, await db.from("films").delete().eq("id", film.id));
  }

  const owner = await findUserByEmail(OWNER_EMAIL);
  if (owner) {
    must(
      "library entries",
      await db.from("library_entries").delete().eq("user_id", owner.id).in("title", LIBRARY_TITLES),
    );
  }

  const fixture = await findUserByEmail(FIXTURE_EMAIL);
  if (fixture) {
    const { error } = await db.auth.admin.deleteUser(fixture.id);
    must("fixture account", { error });
  }

  console.log("Clean.");
}

async function seed() {
  const owner = await findUserByEmail(OWNER_EMAIL);
  if (!owner) {
    console.error(`No account for ${OWNER_EMAIL}. Sign in once first, then re-run.`);
    process.exit(1);
  }
  console.log(`Owner: ${OWNER_EMAIL}`);

  // The second member. Created with a confirmed email so it is a real,
  // usable account rather than a profile row pretending to be one.
  let fixture = await findUserByEmail(FIXTURE_EMAIL);
  if (!fixture) {
    const { data, error } = await db.auth.admin.createUser({
      email: FIXTURE_EMAIL,
      email_confirm: true,
    });
    must("second account", { error });
    fixture = data.user;
  } else {
    console.log("  ✓ second account (already there)");
  }

  /*
   * Upsert, not update.
   *
   * There is no database trigger behind profiles — the app creates the
   * row on first sign-in via /api/auth/ensure-profile. An account made
   * with the admin API has never signed in, so it has no profile, and
   * an UPDATE matching zero rows returns 200: `must` waved it through
   * and the next insert failed on the foreign key instead. Asking for
   * the row back is what makes this checkable.
   */
  must(
    "second member's profile",
    await db
      .from("profiles")
      .upsert({
        id: fixture.id,
        display_name: "Second member (preview)",
        city: "Melbourne",
      })
      .select("id")
      .single(),
  );

  // One Circle, both members in it.
  const { data: existingCircle } = await db
    .from("circles")
    .select("id")
    .eq("name", CIRCLE_NAME)
    .maybeSingle();

  let circleId = existingCircle?.id;
  if (!circleId) {
    const { data, error } = await db
      .from("circles")
      .insert({ name: CIRCLE_NAME, created_by: owner.id })
      .select("id")
      .single();
    must("circle", { error });
    circleId = data.id;
  } else {
    console.log("  ✓ circle (already there)");
  }

  must(
    "circle members",
    await db.from("circle_members").upsert(
      [
        { circle_id: circleId, user_id: owner.id, role: "organiser" },
        { circle_id: circleId, user_id: fixture.id, role: "member" },
      ],
      { onConflict: "circle_id,user_id" },
    ),
  );

  // The film under seal. `rights_notes` carries the marker, never a
  // member-facing field — the same rule seed-preview.mjs follows,
  // because content_notes is read by members.
  const { data: film, error: filmError } = await db
    .from("films")
    .insert({
      title: "Past Lives",
      release_year: 2023,
      runtime_minutes: 105,
      country_code: "US",
      rights_notes: `${MARKER} — sealed recommendation`,
    })
    .select("id")
    .single();
  must("film", { error: filmError });

  const { data: rec, error: recError } = await db
    .from("sealed_recommendations")
    .insert({
      sender_id: fixture.id,
      secret_film_id: film.id,
      personal_note: "Watch it alone",
      runtime_minutes: 105,
    })
    .select("id")
    .single();
  must("sealed recommendation", { error: recError });

  must(
    "recipient",
    await db
      .from("sealed_recommendation_recipients")
      .insert({ recommendation_id: rec.id, recipient_id: owner.id }),
  );

  must(
    "cues",
    await db.from("sealed_recommendation_cues").insert([
      { recommendation_id: rec.id, cue: "Two cities", sort_order: 0 },
      { recommendation_id: rec.id, cue: "Twenty years", sort_order: 1 },
    ]),
  );

  // Library "Yours" — films the member says they have watched.
  //
  // Delete then insert rather than upsert: the uniqueness here is a
  // functional index on (user_id, lower(title), coalesce(year, -1)),
  // which PostgREST's on-conflict cannot target by column list. The
  // same reason seed-preview.mjs does it this way.
  must(
    "clear previous library entries",
    await db.from("library_entries").delete().eq("user_id", owner.id).in("title", LIBRARY_TITLES),
  );

  must(
    "library entries",
    await db.from("library_entries").insert([
      {
        user_id: owner.id,
        title: "Burning",
        release_year: 2018,
        runtime_minutes: 148,
        state: "watched",
        six_words: "Nothing explained and nothing needed explaining",
      },
      {
        user_id: owner.id,
        title: "In the Mood for Love",
        release_year: 2000,
        runtime_minutes: 98,
        state: "watched",
      },
    ]),
  );

  console.log(`\nSealed recommendation is at /circle/recommendation/${rec.id}`);
  console.log("Remove it all with: node scripts/seed-review.mjs --clean");
}

await (process.argv.includes("--clean") ? clean() : seed());
