#!/usr/bin/env node
/**
 * Seeds the preview deployment with something to look at: tonight's
 * opening, a run of past openings behind it, and the real No Trailer
 * file in Storage so the player has something to play.
 *
 * This is preview content, not production content. It is marked in
 * `films.rights_notes` so `--clear` can find it — and only there.
 * `openings.content_notes` is member-facing and carries real content
 * notes or nothing; an earlier version marked that too, which printed
 * "Preview seed — scripts/seed-preview.mjs" on Tonight for members to
 * read.
 *
 * Two spoiler rules it has to obey, because they are the whole product:
 *
 *   1. The storage object name is a UUID. It never describes the film.
 *      The player fetches it by URL, so a descriptive filename would
 *      leak the title in a network request before reveal.
 *   2. Tonight's opening gets NO `reveals` row. `get_house_openings`
 *      and `get_my_library` return the title only when one exists, so
 *      seeding one would hand the member the answer on arrival and
 *      defeat the thing being tested.
 *
 * Past openings do get reveals — they are meant to read as already
 * watched, and without them Library renders as a column of sealed rows
 * that demonstrates nothing.
 *
 * No six-word reviews are seeded. Working rule 5 forbids generating
 * reviews or social proof, and a fabricated review is exactly that,
 * even in preview.
 *
 * Usage:
 *   node scripts/seed-preview.mjs           # seed (idempotent)
 *   node scripts/seed-preview.mjs --clear   # remove everything it wrote
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const MARKER = "Preview seed — scripts/seed-preview.mjs";
const BUCKET = "no-trailer";

/** Stable ids so re-running updates rather than duplicates. */
const TONIGHT = {
  filmId: "b7a1c3d2-0000-4000-8000-000000000101",
  openingId: "b7a1c3d2-0000-4000-8000-000000000201",
  objectName: "9f2c4e17-5b83-4a1d-9c60-2e7f8a3b6d45.mp4",
};

/**
 * The house's back catalogue for the preview. Titles only — working
 * rule 8 forbids third-party film imagery, and the product is
 * typographic by design.
 */
const PAST = [
  { title: "Portrait of a Lady on Fire", year: 2019, runtime: 122, country: "FR" },
  { title: "Parasite", year: 2019, runtime: 132, country: "KR" },
  { title: "In the Mood for Love", year: 2000, runtime: 98, country: "HK" },
  { title: "Under the Skin", year: 2013, runtime: 108, country: "GB" },
  { title: "The Florida Project", year: 2017, runtime: 111, country: "US" },
  { title: "Burning", year: 2018, runtime: 148, country: "KR" },
];

function env() {
  const out = {};
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const e = env();
const admin = createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Deterministic uuid per past title, so re-runs are updates. */
function idFor(kind, index) {
  const tag = kind === "film" ? "1" : "2";
  return `b7a1c3d2-0000-4000-8000-0000000003${tag}${String(index).padStart(1, "0")}`;
}

async function clear() {
  const { data: films } = await admin
    .from("films")
    .select("id")
    .ilike("rights_notes", `${MARKER}%`);
  const filmIds = (films ?? []).map((f) => f.id);

  const { data: secrets } = await admin
    .from("opening_secrets")
    .select("opening_id")
    .in("film_id", filmIds.length ? filmIds : ["00000000-0000-0000-0000-000000000000"]);
  const openingIds = (secrets ?? []).map((s) => s.opening_id);

  if (openingIds.length) await admin.from("openings").delete().in("id", openingIds);
  if (filmIds.length) await admin.from("films").delete().in("id", filmIds);
  await admin.storage.from(BUCKET).remove([TONIGHT.objectName]);

  console.log(`cleared ${openingIds.length} openings, ${filmIds.length} films, 1 storage object`);
}

/**
 * Fail loudly. PostgREST returns errors in the response rather than
 * throwing, and the first version of this script ignored them — so a
 * unique violation on `openings.opening_number` silently left the run
 * half-renumbered (tonight showing as Opening 1 behind a back catalogue
 * numbered 2–7) and reported success.
 */
function must(label, { error }) {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function seed() {
  // Delete first, then insert. `opening_number` is unique, so upserting
  // a renumbered run collides with the numbers the previous run left
  // behind — there is no ordering of upserts that avoids it. Starting
  // from empty is the only thing that makes this idempotent.
  await clear();

  // --- the No Trailer file -------------------------------------------
  const video = readFileSync(
    new URL("../tests/e2e/fixtures/sample-no-trailer.mp4", import.meta.url),
  );
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(TONIGHT.objectName, video, { contentType: "video/mp4", upsert: true });
  if (uploadError) throw new Error(`upload failed: ${uploadError.message}`);
  console.log(`uploaded No Trailer as ${TONIGHT.objectName} (${video.length} bytes)`);

  // --- tonight --------------------------------------------------------
  const now = new Date();
  const openedAt = new Date(now.getTime() - 60 * 60 * 1000); // an hour ago

  must(
    "films (tonight)",
    await admin.from("films").upsert({
      id: TONIGHT.filmId,
      title: "Whiplash",
      release_year: 2014,
      runtime_minutes: 106,
      country_code: "US",
      // The marker lives here on purpose. `films` is owner/service-role
      // only, so this is invisible to members — unlike
      // `openings.content_notes`, which is member-facing and where an
      // earlier version of this script wrongly put it, printing
      // "Preview seed — scripts/seed-preview.mjs" on Tonight under
      // Content notes.
      rights_notes: `${MARKER} — tonight`,
    }),
  );

  must(
    "openings (tonight)",
    await admin.from("openings").upsert({
      id: TONIGHT.openingId,
      opening_number: PAST.length + 1,
      opens_at: openedAt.toISOString(),
      closes_at: null,
      status: "open",
      runtime_minutes: 106,
      availability_count: 3,
      minimum_access_type: "subscription",
      // UUID, never descriptive. See the header.
      no_trailer_storage_path: TONIGHT.objectName,
      // Member-facing. Real content notes only — no marker, and nothing
      // that narrows down the film.
      content_notes: "Sustained verbal intimidation, and one bloodied injury.",
    }),
  );

  must(
    "opening_secrets (tonight)",
    await admin.from("opening_secrets").upsert({
      opening_id: TONIGHT.openingId,
      film_id: TONIGHT.filmId,
      approved_at: now.toISOString(),
    }),
  );

  // Three safe words. None of them name or strongly imply the film.
  must(
    "opening_cues",
    await admin.from("opening_cues").insert([
      { opening_id: TONIGHT.openingId, cue: "Tempo", sort_order: 0 },
      { opening_id: TONIGHT.openingId, cue: "Ambition", sort_order: 1 },
      { opening_id: TONIGHT.openingId, cue: "Cruelty", sort_order: 2 },
    ]),
  );

  must(
    "playback_destinations",
    await admin.from("playback_destinations").insert([
      {
        film_id: TONIGHT.filmId,
        territory: "AU",
        provider_name: "Netflix",
        access_type: "subscription",
        deep_link: "https://www.netflix.com/search?q=Whiplash",
        verified_at: null, // unverified on purpose — see LAUNCH_CHECKLIST item 8
        is_active: true,
      },
      {
        film_id: TONIGHT.filmId,
        territory: "AU",
        provider_name: "Prime Video",
        access_type: "rental",
        deep_link: "https://www.primevideo.com/search?phrase=Whiplash",
        verified_at: null,
        is_active: true,
      },
    ]),
  );
  console.log(`programmed tonight: opening ${PAST.length + 1}, sealed, 3 cues, 2 provider links`);

  // --- the nights behind it -------------------------------------------
  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  for (const [i, film] of PAST.entries()) {
    const filmId = idFor("film", i);
    const openingId = idFor("opening", i);
    const openedOn = new Date(openedAt.getTime() - (i + 1) * 24 * 60 * 60 * 1000);

    must(
      `films (${film.title})`,
      await admin.from("films").upsert({
        id: filmId,
        title: film.title,
        release_year: film.year,
        runtime_minutes: film.runtime,
        country_code: film.country,
        rights_notes: `${MARKER} — past`,
      }),
    );

    must(
      `openings (past ${i})`,
      await admin.from("openings").upsert({
        id: openingId,
        // Oldest night is 1, counting up to tonight. `i` runs
        // newest-first through PAST, so it inverts.
        opening_number: PAST.length - i,
        opens_at: openedOn.toISOString(),
        closes_at: new Date(openedOn.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        status: "closed",
        runtime_minutes: film.runtime,
        availability_count: 2,
        minimum_access_type: "subscription",
        no_trailer_storage_path: TONIGHT.objectName,
        // Member-facing: left empty rather than marked. See the note on
        // tonight's content_notes above.
        content_notes: null,
      }),
    );

    must(
      `opening_secrets (past ${i})`,
      await admin.from("opening_secrets").upsert({
        opening_id: openingId,
        film_id: filmId,
        approved_at: openedOn.toISOString(),
      }),
    );

    // Revealed and watched, so Library has something to show. Tonight
    // deliberately gets neither.
    if (owner?.id) {
      await admin
        .from("reveals")
        .upsert({ user_id: owner.id, opening_id: openingId, revealed_at: openedOn.toISOString() });
      await admin.from("watches").upsert({
        user_id: owner.id,
        opening_id: openingId,
        state: "watched",
        watched_at: openedOn.toISOString(),
      });
    }
  }

  console.log(
    owner?.id
      ? `seeded ${PAST.length} past openings, revealed and watched for the owner`
      : `seeded ${PAST.length} past openings (no owner profile yet — sign in once, then re-run to mark them watched)`,
  );
}

const mode = process.argv[2];
try {
  if (mode === "--clear") await clear();
  else await seed();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
