-- House Dark — 0019_trust_us_primary_theme
--
-- Fixes a regression 0018 introduced.
--
-- 0016 offers the member every distinct value in
-- film_house_records.territories. With the two seeded records that was
-- a short, curated list. Importing the 500-film corpus put each film's
-- primary theme *and* its search tags into that column, so the member
-- was about to be offered 138 choices: "I want to feel tense" sitting
-- beside "tense", "suspense", "chase" and "claustrophobic".
--
-- That is the filter configuration the handover rules out, and close to
-- the catalogue it rules out twice. The tags were never meant to be
-- offered — 09_FILM_LIBRARY_500.md has them resolving free text *into*
-- one of the 20 curated themes, which is the opposite direction.
--
-- So the two roles are separated rather than sharing a column:
-- territories stays the match surface, and primary_theme is the short
-- list of things the House will actually say out loud.

alter table film_house_records
  add column if not exists primary_theme text;

-- Backfill. A corpus row carries its curated theme phrased as a member's
-- sentence ("I want to feel tense"), which is what distinguishes it from
-- a tag. Rows predating the corpus use a short label instead — the
-- handover allows the interface to shorten these — so they keep the
-- first territory they have. Matching only the sentence form dropped
-- those rows out of the offer entirely, which broke the House's promise
-- to list every theme it can actually answer.
update film_house_records r
set primary_theme = coalesce(
  (select t from unnest(r.territories) t where t like 'I want%' limit 1),
  (select t from unnest(r.territories) t limit 1)
)
where r.primary_theme is null;

-- A one-off backfill is not enough: every record written after this
-- migration — by the Desk, by a future import, by a test fixture —
-- would arrive with primary_theme null and silently vanish from the
-- offer. Deriving it on write keeps the column a property of the row
-- rather than something each caller has to remember.
create or replace function set_film_house_record_primary_theme()
returns trigger
language plpgsql
as $$
begin
  if new.primary_theme is null then
    new.primary_theme := coalesce(
      (select t from unnest(new.territories) t where t like 'I want%' limit 1),
      (select t from unnest(new.territories) t limit 1)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists film_house_records_set_primary_theme on film_house_records;
create trigger film_house_records_set_primary_theme
  before insert or update of territories, primary_theme on film_house_records
  for each row execute function set_film_house_record_primary_theme();

create index if not exists film_house_records_primary_theme_idx
  on film_house_records (primary_theme);

-- Only themes with an approved film behind them, so the House never
-- offers a territory it cannot answer. Records predating the corpus
-- have no primary_theme and simply do not appear in the offer — they
-- remain reachable by their tags through get_trust_us_recommendation().
create or replace function list_trust_us_territories()
returns table (territory text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct r.primary_theme
  from film_house_records r
  where r.editorial_approved_at is not null
    and r.primary_theme is not null
  order by 1;
$$;

revoke all on function list_trust_us_territories() from public;
grant execute on function list_trust_us_territories() to authenticated;
