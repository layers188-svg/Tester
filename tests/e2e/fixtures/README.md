# E2E fixtures

`desk-opening-flow.spec.ts` uploads
`assets/no-trailers/2f8a41c7e9b04d63.mp4` to exercise the Programming
Desk upload and approval mechanics. The masters live there — in the
repository, not served — alongside the handover's lightweight developer
test clip.

## About the file

Logan supplied the real seed No Trailer (brief §18). Two notes on it:

- **The name is not an accident.** The original filename described the
  footage, and that description points fairly directly at the protected
  title. Brief §12 rule 5 only forbids the title itself, and the
  validator agrees the original passed — but a filename sitting in a
  repository, a diff and a URL is exactly the kind of place §11 says a
  film's identity must not surface. An opaque name says nothing.
- **It is not served from the repository.** Real No Trailers belong in
  Supabase Storage, uploaded through the Desk, which rewrites them to a
  UUID object name. It sat under `public/` briefly, which was wrong
  twice over: the architecture always said Storage, and Cloudflare
  Workers refuses a static asset over 5 MB — this one is 9.9 MB, and a
  deploy failed on exactly that. `noTrailerUrl()` passes an absolute
  path or URL through untouched and prefixes a bare object name with the
  bucket, so the move is one column and no code.

Measured: 10.08s, 9.9 MB, MP4, no audio track. That clears the brief's
preferred 8-12s window and the Brand Guidelines' tighter 10-10.5s one,
and sits under the 25 MB beta cap. Verified against `validateMediaFile`
with the seed title as the protected term: zero issues.

`9c1d5b02a7f34e18.mp4` is the handover's lightweight developer test
clip, kept alongside it. It is not attached to any film — a test pattern
standing in as a real film's No Trailer would be a lie about what the
member is watching.

`/dev/stage` plays `public/dev/stage-no-trailer.webm`, a generated
abstract field that exists purely so the ritual and the Library replay
can be rendered and measured. It is 147 KB and clearly not a film.

Any short, non-sensitive MP4 works as a replacement in the upload test —
that test does not care about the content.
