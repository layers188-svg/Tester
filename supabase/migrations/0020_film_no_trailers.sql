-- House Dark — 0020_film_no_trailers
--
-- Attaches the No Trailers the House actually has to the films they
-- belong to, so a Library record has something to play.
--
-- There is exactly one of them today: the seed No Trailer, which was
-- made for Whiplash and is film 379 in the House Dark 500. The other
-- 499 films get nothing, and the Library shows nothing for them —
-- rather than borrowing this one and presenting it as theirs, which
-- would be a fake standing in for a backend feature (CLAUDE.md rule 4)
-- and would also be a lie about what the member is watching.
--
-- The path is served from public/film-videos/ under an opaque name,
-- which is interim. Real No Trailers belong in Supabase Storage,
-- uploaded through the Programming Desk, which rewrites them to a UUID
-- object name. Nothing in the code cares which it is: noTrailerUrl()
-- passes an absolute path through untouched and prefixes a bare object
-- name with the bucket, so moving these to Storage is a change to this
-- column and nothing else.

update films
set no_trailer_storage_path = '/film-videos/2f8a41c7e9b04d63.mp4'
where id = '75980d30-e092-5ecf-812c-4f510b86cdfc';

-- The opening that seeds local development points at the same picture,
-- so an evening watched there can be returned to afterwards.
update films f
set no_trailer_storage_path = coalesce(f.no_trailer_storage_path, o.no_trailer_storage_path)
from opening_secrets os
join openings o on o.id = os.opening_id
where f.id = os.film_id
  and o.no_trailer_storage_path is not null;
