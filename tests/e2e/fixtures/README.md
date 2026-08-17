# E2E fixtures

The No Trailer upload journey no longer keeps a video here.

`desk-opening-flow.spec.ts` uploads `media/no-trailer/HDNT-006.mp4`,
one of the six supplied sample assets. The copy that used to live in
this directory was byte-identical to it — the same file committed
twice under two names, 10 MB of duplication and two places to keep in
step.

The six assets and their technical metadata are in
`media/no-trailer/manifest.json`. That manifest carries no film titles
and no film mapping, on purpose: `openings.no_trailer_storage_path` is
visible to the client before the reveal, so anything naming its film
would hand over the title while the picture is still sealed. The
mapping lives in the database, behind the owner-only tables.

Any short, silent, non-sensitive MP4 works as a replacement — the test
exercises the upload and approval mechanics, not the content.
