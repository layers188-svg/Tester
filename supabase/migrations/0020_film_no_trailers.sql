-- House Dark — 0020_film_no_trailers
--
-- A film's No Trailer, so a Library record has something to play.
--
-- The only rule here is the general one: a film inherits the No Trailer
-- of the opening it was programmed as. That is the honest source —
-- the picture the House actually made for it — and it means the
-- Library replay lights up for every past opening the moment Storage
-- exists, with no per-film bookkeeping.
--
-- No film is given a No Trailer that was made for a different one. The
-- catalogue's 500 have none until one is uploaded through the
-- Programming Desk, and the Library shows nothing for them rather than
-- borrowing another film's and presenting it as theirs.
--
-- Where the masters live
-- ----------------------
-- `assets/no-trailers/` — in the repository, not served. They were
-- briefly under `public/`, which was wrong twice over: the architecture
-- always said Storage is the home for these, and Cloudflare Workers
-- refuses a static asset over 5 MB, which the seed master (9.9 MB)
-- exceeds. Upload them through the Desk, which rewrites each to an
-- opaque object name in the no-trailer bucket.
--
-- Nothing in the code cares which it is: noTrailerUrl() passes an
-- absolute path or URL through untouched and prefixes a bare object
-- name with the bucket.

update films f
set no_trailer_storage_path = coalesce(f.no_trailer_storage_path, o.no_trailer_storage_path)
from opening_secrets os
join openings o on o.id = os.opening_id
where f.id = os.film_id
  and o.no_trailer_storage_path is not null;
