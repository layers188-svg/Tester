# E2E fixtures

`desk-opening-flow.spec.ts` uploads `sample-no-trailer.mp4` from this
directory. No video fixture was available to generate in this build
environment (no ffmpeg, and no seed footage was supplied — see brief
§23 item 6 / `LAUNCH_CHECKLIST.md`).

Before running the full Playwright suite against a live project, add a
short (8-12s, ideally 1080x1920) MP4 here named `sample-no-trailer.mp4`.
It can be anything non-sensitive — the test only exercises the upload
and approval mechanics, not the content.
