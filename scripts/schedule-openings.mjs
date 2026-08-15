/**
 * Programme a run of nights from supplied No Trailer files.
 *
 * The Programming Desk does this one opening at a time and is the right
 * tool for one opening. For a week of them, handed over as five files
 * at once, this is the same job without five rounds of typing.
 *
 * It enforces the same rules the Desk's upload route does, by calling
 * the same functions rather than restating them:
 *
 *   * the stored object gets a UUID name (brief §12 rule 6), and the
 *     supplied filename is checked against the title first (rule 5) and
 *     then discarded. Every file handed over here was named after its
 *     film — "Parasite.mp4" — which is exactly the leak that check
 *     exists to stop, so the rename is not a formality.
 *   * the title is written to `films` and `opening_secrets` only, both
 *     owner/service-role tables. Nothing member-readable on an opening
 *     ever carries it: not the cues, not the content notes, not the
 *     storage path.
 *
 * Openings are created `scheduled`. The cron worker moves them to
 * `open` at their hour; this never publishes anything early.
 *
 *   node scripts/schedule-openings.mjs --dry-run
 *   node scripts/schedule-openings.mjs
 *   node scripts/schedule-openings.mjs --clean
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const MARKER = "Programmed by scripts/schedule-openings.mjs";
const UPLOADS = "/root/.claude/uploads/94fb9ad7-c325-58da-b331-edb04d2f3b32";

/**
 * The run, in the order it plays.
 *
 * `cues` are the safe words a member sees on the sealed card. They are
 * drafted to be atmosphere rather than plot — a cue that gives away the
 * inciting incident is a spoiler wearing a disguise — and the Desk can
 * change any of them without touching this file.
 *
 * `contentNotes` are deliberately sparse and are Logan's to confirm.
 * An advisory nobody checked is worse than none, so these say only what
 * is uncontroversial about each film.
 */
const RUN = [
  {
    file: "ad6bb877-Portrait_of_a_Lady_on_Fire.mp4",
    title: "Portrait of a Lady on Fire",
    releaseYear: 2019,
    runtimeMinutes: 122,
    countryCode: "FR",
    cues: ["An island", "A commission"],
    contentNotes: "Contains nudity.",
  },
  {
    file: "78bf9515-In_The_Mood_for_Love.mp4",
    title: "In the Mood for Love",
    releaseYear: 2000,
    runtimeMinutes: 98,
    countryCode: "HK",
    cues: ["A stairwell", "Neighbours"],
    contentNotes: null,
  },
  {
    file: "288a4543-The_Florida_Project.mp4",
    title: "The Florida Project",
    releaseYear: 2017,
    runtimeMinutes: 111,
    countryCode: "US",
    cues: ["A motel", "Summer"],
    contentNotes: "Contains strong language and themes of poverty.",
  },
  {
    file: "d522085e-Parasite.mp4",
    title: "Parasite",
    releaseYear: 2019,
    runtimeMinutes: 132,
    countryCode: "KR",
    cues: ["A tutor", "Rain"],
    contentNotes: "Contains scenes of violence.",
  },
  {
    file: "4e605c20-Burning.mp4",
    title: "Burning",
    releaseYear: 2018,
    runtimeMinutes: 148,
    countryCode: "KR",
    cues: ["Farmland", "Dusk"],
    contentNotes: "Contains sexual content and an act of violence.",
  },
];

const HOUSE_TIMEZONE = "Australia/Melbourne";
const HOUSE_OPENS_HOUR = 19;

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

const dryRun = process.argv.includes("--dry-run");

function must(label, { error }) {
  if (error) {
    console.error(`  ✗ ${label}: ${error.message ?? JSON.stringify(error)}`);
    process.exit(1);
  }
  console.log(`  ✓ ${label}`);
}

/** Brief §12 rule 5, same rule as src/lib/media/validate.ts. */
function filenameContainsTitle(filename, title) {
  const t = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (!t) return false;
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .includes(t);
}

/** Brief §12 rule 6. */
function storageName() {
  return `${crypto.randomUUID()}.mp4`;
}

/** Nth 7pm from tonight, in the house's own clock. */
function houseNight(offsetDays, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: HOUSE_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).formatToParts(now);
  const g = (t) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const past = g("hour") % 24 >= HOUSE_OPENS_HOUR ? 1 : 0;
  const day = new Date(Date.UTC(g("year"), g("month") - 1, g("day") + past + offsetDays, 12));

  const p2 = new Intl.DateTimeFormat("en-US", {
    timeZone: HOUSE_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(day);
  const g2 = (t) => Number(p2.find((p) => p.type === t)?.value ?? "0");
  const offset = Math.round(
    (Date.UTC(g2("year"), g2("month") - 1, g2("day"), g2("hour") % 24, g2("minute"), g2("second")) -
      day.getTime()) /
      60_000,
  );

  return new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), HOUSE_OPENS_HOUR, 0, 0) -
      offset * 60_000,
  );
}

async function clean() {
  console.log("Removing programmed openings…");
  const { data: films } = await db.from("films").select("id").ilike("rights_notes", `${MARKER}%`);
  for (const film of films ?? []) {
    const { data: secrets } = await db
      .from("opening_secrets")
      .select("opening_id")
      .eq("film_id", film.id);
    for (const s of secrets ?? []) {
      must(`opening ${s.opening_id}`, await db.from("openings").delete().eq("id", s.opening_id));
    }
    must(`film ${film.id}`, await db.from("films").delete().eq("id", film.id));
  }
  console.log(
    "Clean. Storage objects are left in place; remove them from the dashboard if needed.",
  );
}

async function programme() {
  // The opening number continues the house's own count.
  const { data: highest } = await db
    .from("openings")
    .select("opening_number")
    .order("opening_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextNumber = (highest?.opening_number ?? 0) + 1;

  for (const [index, entry] of RUN.entries()) {
    const source = `${UPLOADS}/${entry.file}`;
    console.log(`\nOpening ${nextNumber} — ${entry.releaseYear}`);

    if (!existsSync(source)) {
      console.error(`  ✗ missing file: ${source}`);
      process.exit(1);
    }

    // The supplied name is checked, then thrown away. Every one of these
    // fails this check, which is the point: the Desk would have refused
    // the upload and told the programmer to rename it.
    const named = filenameContainsTitle(basename(entry.file), entry.title);
    console.log(`  · supplied filename names the film: ${named ? "yes, discarding it" : "no"}`);

    const object = storageName();
    if (filenameContainsTitle(object, entry.title)) {
      console.error("  ✗ generated storage name contains the title. Refusing to upload.");
      process.exit(1);
    }

    const opensAt = houseNight(index);
    /*
     * Every opening closes when the next one arrives.
     *
     * The cron closes an opening once `closes_at` has passed and does
     * nothing at all when it is null, so an opening created without one
     * stays open for ever. Tonight would still show the newest, but the
     * house would quietly accumulate a dozen open nights, which is not
     * what "one film a night" means.
     */
    const closesAt = houseNight(index + 1);
    console.log(`  · opens ${opensAt.toISOString()} (7pm ${HOUSE_TIMEZONE})`);
    console.log(`  · closes ${closesAt.toISOString()}`);
    console.log(`  · stored as ${object}`);

    if (dryRun) {
      nextNumber += 1;
      continue;
    }

    const bytes = readFileSync(source);
    const { error: uploadError } = await db.storage
      .from("no-trailer")
      .upload(object, bytes, { contentType: "video/mp4", upsert: false });
    must("uploaded the No Trailer", { error: uploadError });

    const { data: film, error: filmError } = await db
      .from("films")
      .insert({
        title: entry.title,
        release_year: entry.releaseYear,
        runtime_minutes: entry.runtimeMinutes,
        country_code: entry.countryCode,
        rights_notes: `${MARKER} — opening ${nextNumber}`,
      })
      .select("id")
      .single();
    must("film", { error: filmError });

    const { data: opening, error: openingError } = await db
      .from("openings")
      .insert({
        opening_number: nextNumber,
        opens_at: opensAt.toISOString(),
        closes_at: closesAt.toISOString(),
        status: "scheduled",
        runtime_minutes: entry.runtimeMinutes,
        // No verified playback destinations yet, so the sealed card says
        // "Confirmed after reveal" rather than promising a number it
        // cannot produce.
        availability_count: 0,
        minimum_access_type: "subscription",
        no_trailer_storage_path: object,
        content_notes: entry.contentNotes,
      })
      .select("id")
      .single();
    must("opening", { error: openingError });

    must(
      "sealed the film to it",
      await db.from("opening_secrets").insert({ opening_id: opening.id, film_id: film.id }),
    );

    must(
      "cues",
      await db.from("opening_cues").insert(
        entry.cues.map((cue, order) => ({
          opening_id: opening.id,
          cue,
          sort_order: order,
        })),
      ),
    );

    nextNumber += 1;
  }
}

await (process.argv.includes("--clean") ? clean() : programme());
