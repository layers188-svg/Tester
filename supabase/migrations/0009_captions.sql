-- House Dark — 0009_captions
-- Brief §16 accessibility rule 6: "Captions for spoken No Trailer
-- audio." A No Trailer is usually a wordless mood piece, but the moment
-- one carries speech it needs a caption track, so the slot has to exist
-- before that opening is programmed rather than after.
--
-- Like the video itself, the caption file is stored under a UUID name in
-- the public no-trailer bucket — the path must never describe the film.

alter table openings add column no_trailer_captions_path text;

comment on column openings.no_trailer_captions_path is
  'WebVTT object name in the no-trailer bucket. UUID filename only, never descriptive.';
