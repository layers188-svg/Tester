#!/usr/bin/env node
/**
 * Turns data/house-dark-500.json into a migration.
 *
 * The catalogue is reference data the product depends on — Trust Us has
 * nothing to recommend without it — so it ships as a migration rather
 * than as a seed. `supabase/seed.sql` is local-development only and
 * explicitly says so; a production project that ran only the migrations
 * would have an empty Trust Us.
 *
 * The JSON stays checked in as the source of truth. Re-run this after
 * editing it:
 *
 *   node scripts/generate-catalogue-migration.mjs
 *
 * Film and territory ids are derived from the catalogue's own ids with
 * md5, so they are stable across regenerations and the inserts are
 * idempotent — running the migration twice changes nothing.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "data/house-dark-500.json";
const TARGET = "supabase/migrations/0018_house_dark_500.sql";

/**
 * A stable UUID for a catalogue row. Same input, same id, every time —
 * which is what makes the inserts idempotent and lets an edited line
 * update the row it belongs to rather than creating a second one.
 *
 * Version and variant nibbles are set so the result is a well-formed
 * v5-shaped UUID. Postgres would accept the raw digest, but a value
 * that says what it is beats one that merely parses.
 */
function stableUuid(namespace, key) {
  const bytes = createHash("md5").update(`${namespace}:${key}`).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function slugFor(theme) {
  return theme
    .toLowerCase()
    .replace(/^i want (to be |to feel |a |an |something |)/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Postgres literal. Single quotes double up; nothing else needs escaping here. */
function q(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function textArray(values) {
  return `array[${values.map(q).join(", ")}]::text[]`;
}

const catalogue = JSON.parse(readFileSync(SOURCE, "utf8"));
const themes = catalogue.themes;

const seenSlugs = new Set();
const territoryRows = [];
const filmRows = [];
const recordRows = [];

for (const [index, theme] of themes.entries()) {
  const slug = slugFor(theme.theme);
  if (seenSlugs.has(slug)) throw new Error(`Duplicate territory slug: ${slug}`);
  seenSlugs.add(slug);

  territoryRows.push(
    `  (${q(slug)}, ${q(theme.theme)}, ${q(theme.search_example)}, ${q(theme.description)}, ${textArray(theme.tags)}, ${index + 1})`,
  );

  for (const film of theme.films) {
    const wordCount = film.six_word_synopsis.trim().split(/\s+/).length;
    if (wordCount !== 6) {
      throw new Error(`"${film.title}" has ${wordCount} words, not six: ${film.six_word_synopsis}`);
    }
    const id = stableUuid("house-dark-500/film", film.id);
    // runtime_minutes is 0 — see the note in the generated file.
    filmRows.push(`  (${q(id)}::uuid, ${q(film.title)}, ${film.year}, 0, ${q(film.canon_anchor)})`);
    recordRows.push(
      `  (${q(id)}::uuid, ${q(film.six_word_synopsis)}, ${textArray([slug])}, ` +
        `${q(film.canon_anchor)}, now(), 1)`,
    );
  }
}

const sql = `-- House Dark — 0018_house_dark_500
--
-- The House Dark 500: twenty territories, twenty-five films each, every
-- one carrying a six-word line written for it.
--
-- GENERATED FILE. Do not edit by hand — edit data/house-dark-500.json
-- and re-run:  node scripts/generate-catalogue-migration.mjs
--
-- This is a migration rather than a seed because Trust Us has nothing to
-- recommend without it, and supabase/seed.sql is local development only.
-- A production project that ran the migrations and not the seed would
-- otherwise have an empty House.
--
-- Territories become first-class rows here. They were bare strings on
-- film_house_records, which was enough when an owner typed them in one
-- at a time, but the catalogue gives each one a prompt, a description
-- and tags — "I want to feel tense", "Something tense where the
-- pressure never lets up" — and that copy belongs in the product, not
-- in a generator.
--
-- Ids are derived from the catalogue's own ids, so re-running this
-- changes nothing and an edited line updates the row it belongs to.

-- ---------------------------------------------------------------------
-- trust_us_territories
-- ---------------------------------------------------------------------

create table if not exists trust_us_territories (
  slug text primary key,
  label text not null,
  prompt text not null,
  description text not null,
  tags text[] not null default array[]::text[],
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trust_us_territories_set_updated_at on trust_us_territories;
create trigger trust_us_territories_set_updated_at
  before update on trust_us_territories
  for each row execute function set_updated_at();

alter table trust_us_territories enable row level security;

-- The territories are the menu, not the meal: a member has to be able
-- to read them to choose one. They carry no film identity at all.
drop policy if exists trust_us_territories_read on trust_us_territories;
create policy trust_us_territories_read on trust_us_territories
  for select
  using (auth.uid() is not null);

drop policy if exists trust_us_territories_owner_write on trust_us_territories;
create policy trust_us_territories_owner_write on trust_us_territories
  for all
  using (is_owner())
  with check (is_owner());

insert into trust_us_territories (slug, label, prompt, description, tags, sort_order) values
${territoryRows.join(",\n")}
on conflict (slug) do update set
  label = excluded.label,
  prompt = excluded.prompt,
  description = excluded.description,
  tags = excluded.tags,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------
-- Provenance
-- ---------------------------------------------------------------------
--
-- Which canon a film came from. Editorial context for the Desk; never
-- shown to a member, who gets a title and six words and nothing else.

alter table films
  add column if not exists canon_anchor text;

alter table film_house_records
  add column if not exists canon_anchor text;

-- ---------------------------------------------------------------------
-- The films
-- ---------------------------------------------------------------------
--
-- runtime_minutes is 0: the catalogue does not carry running times, and
-- Trust Us never shows one. A film that later becomes an Opening gets
-- its real runtime from the Programming Desk at that point.

insert into films (id, title, release_year, runtime_minutes, canon_anchor) values
${filmRows.join(",\n")}
on conflict (id) do update set
  title = excluded.title,
  release_year = excluded.release_year,
  canon_anchor = excluded.canon_anchor;

-- ---------------------------------------------------------------------
-- The six-word lines
-- ---------------------------------------------------------------------
--
-- Approved on import. These were written for the catalogue and read as
-- editorial copy; the Desk can still revise any of them, and doing so
-- bumps the version and sends it back through a human.

insert into film_house_records
  (film_id, six_words_before, territories, canon_anchor, editorial_approved_at, version)
values
${recordRows.join(",\n")}
on conflict (film_id) do update set
  six_words_before = excluded.six_words_before,
  territories = excluded.territories,
  canon_anchor = excluded.canon_anchor;
`;

writeFileSync(TARGET, sql);
console.log(
  `Wrote ${TARGET}: ${territoryRows.length} territories, ${filmRows.length} films, ${recordRows.length} records.`,
);
