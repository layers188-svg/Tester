-- House Dark — a member's own Library additions are theirs alone.
--
-- These rows are the one place a member writes a film title, so the
-- boundary that matters is that they cannot reach `films` and nobody
-- else can reach their rows.

do $$
declare
  v_id uuid;
  v_mine integer;
  v_theirs integer;
  v_films integer;
  v_error text;
begin
  perform tests.act_as('22222222-2222-4222-8222-222222222222');

  insert into library_entries (user_id, title, release_year, runtime_minutes)
  values ('22222222-2222-4222-8222-222222222222', 'A Film I Watched', 1999, 120)
  returning id into v_id;

  select count(*) into v_mine from library_entries where id = v_id;
  perform tests.check('LE.1', 'a member can add a film to their own Library',
    v_mine = 1, 'the member could not read back their own entry');

  -- The boundary that matters: this must not be a way into `films`.
  begin
    insert into films (title, runtime_minutes) values ('Sneaking In', 100);
    v_films := 1;
  exception when others then
    v_films := 0;
    v_error := sqlerrm;
  end;
  perform tests.check('LE.2', 'adding to the Library is not a way to write films',
    v_films = 0, 'a member inserted into the protected films table');

  -- Another member's Library is not readable.
  perform tests.act_as('33333333-3333-4333-8333-333333333333');
  select count(*) into v_theirs from library_entries where id = v_id;
  perform tests.check('LE.3', 'another member cannot read that entry',
    v_theirs = 0, format('a member read someone else''s Library entry (%s rows)', v_theirs));

  -- Nor deletable.
  delete from library_entries where id = v_id;
  perform tests.act_as('22222222-2222-4222-8222-222222222222');
  select count(*) into v_mine from library_entries where id = v_id;
  perform tests.check('LE.4', 'another member cannot delete it either',
    v_mine = 1, 'someone else deleted the entry');

  -- The member can remove their own.
  delete from library_entries where id = v_id;
  select count(*) into v_mine from library_entries where id = v_id;
  perform tests.check('LE.5', 'the member can remove their own entry',
    v_mine = 0, 'the entry survived its owner deleting it');
end $$;

-- Anonymous visitors see nothing at all.
select tests.act_as_service();
insert into library_entries (user_id, title)
values ('22222222-2222-4222-8222-222222222222', 'Service Seeded');

do $$
declare
  v_rows integer;
begin
  perform tests.act_as_anon();
  select count(*) into v_rows from library_entries;
  perform tests.check('LE.6', 'an anonymous visitor sees no Library entries',
    v_rows = 0, format('anon read %s Library entries', v_rows));
end $$;
