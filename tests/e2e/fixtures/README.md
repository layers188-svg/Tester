# E2E fixtures

`desk-opening-flow.spec.ts` uploads `sample-no-trailer.mp4` from this
directory to exercise the Programming Desk upload and approval mechanics.

## About the file in here

Logan supplied the real seed No Trailer (brief §18) and it is committed
here under a deliberately neutral name. Two notes on that:

- **The name is not an accident.** The original filename described the
  footage, and that description points fairly directly at the protected
  title. Brief §12 rule 5 only forbids the title itself, and the
  validator agrees the original passed — but a filename sitting in a
  repository, a diff and a checkout is exactly the kind of place §11
  says a film's identity must not surface. `sample-no-trailer.mp4` says
  nothing.
- **This is a test fixture, not the production asset.** Nothing serves
  video from the repository. The real No Trailer belongs in Supabase
  Storage, uploaded through the Programming Desk, which rewrites it to
  a UUID object name (`generateStorageName`) so the stored path carries
  no meaning either.

Measured: 10.08s, 9.9 MB, MP4, no audio track. That clears the brief's
preferred 8-12s window and the Brand Guidelines' tighter 10-10.5s one,
and sits under the 25 MB beta cap. Verified against `validateMediaFile`
with the seed title as the protected term: zero issues.

Any short, non-sensitive MP4 works as a replacement — the test does not
care about the content.
