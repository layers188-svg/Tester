# Staging simulator media

`stage-no-trailer.webm` is a generated 10-second abstract field —
warm light drifting across a near-black ground, one slow rule of light.
No footage, no faces, no readable text, no audio track. It exists so the
staging state simulator (`/dev/stage`) and the rendered motion tests can
run the No Trailer beat end to end.

It is **not** a No Trailer and must never be served to a member. Nothing
outside `src/app/dev/stage/` references it, and that route 404s in
production.

## Why WebM, when the product uses MP4

The Chromium that Playwright ships is the open-source build, which
carries no H.264 decoder — `canPlayType('video/mp4; codecs="avc1…"')`
returns empty. The repository's real seed asset
(`tests/e2e/fixtures/sample-no-trailer.mp4`) and the handover's
`media/no-trailer-dev-test-10s.mp4` are both H.264, so neither will play
in that browser and the ritual could not be rendered past the gate.

This is a property of the test browser, not of the assets: the player
handled the unplayable source exactly as it should, showing `RETRY` and
refusing to advance to the reveal, which is acceptance test C.

Production is unaffected. Real No Trailers are uploaded through the
Programming Desk to Supabase Storage and played in the member's own
browser, where H.264 is universal.

## Regenerating it

`node scripts/make-stage-clip.mjs` — draws the field on a canvas and
records it with MediaRecorder in the same Chromium, so it needs no
encoder beyond the browser.
