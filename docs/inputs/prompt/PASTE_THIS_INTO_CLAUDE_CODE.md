# Paste this into Claude Code

You are taking over the House Dark production build.

First read `CLAUDE.md`, `README_START_HERE.md`, `docs/00_BUILD_BRIEF_FINAL.md`, `docs/01_MOTION_SYSTEM.md`, `docs/09_FILM_LIBRARY_500.md`, `docs/10_SAMPLE_VIDEO_ASSETS.md` and `qa/ACCEPTANCE_TESTS.md` in full. Then inspect the existing repository before proposing or making architectural changes.

Continue autonomously. Do not ask me to restate product decisions already covered in the handover. Do not ask me to perform coding or routine setup that you can complete. Only stop for a genuinely external action such as a missing platform secret, account permission, DNS change, legal approval or an unresolved subjective choice between two strong options.

Priority order:

1. Protect the title at the server/data boundary.
2. Make Tonight follow sealed → clue → 10 second No Trailer → black hold → server reveal → title.
3. Fix post-watch six words and The Room eligibility.
4. Build the premium House Dark entry and the signature motion system.
5. Build The Room as Your Review / Your Circle / The House with working local scroll progress and typography as scenery.
6. Rebuild Search as Trust Us using the supplied finite 500-film corpus: theme → one title + six words → Trust Us / Seen It. This replaces the endless/open-ended recommendation repository. Never show the 500 as a catalogue and never use an external API/LLM as an unlimited candidate pool.
7. Build Circle incoming and outgoing Send Under Seal.
8. Finish Library search, add-film and in-place record unfolding.
9. Run every acceptance test and rendered motion test before handoff.

The V15 prototype is the preferred visual reference. The later V16 control experiment is not the target. Prototype files are visual/behavioural references, not production code. Recreate the behaviour cleanly inside the real app.

Do not dilute House Dark into conventional streaming or SaaS UI. No poster grid, ratings, generic cards, generic loading screens or film-themed decoration.

For motion, do not tell me an animation exists because it is in CSS. Render it and verify the geometry changes. The quality bar is Siena Film Foundation, Seasoned, Mouthful of Dust and PP Fragment, translated into House Dark's own product logic.

Before media work, inventory the six sample videos already expected in the repository. Do not ask me to re-upload them unless you have proven they are missing.

Before public launch, complete `docs/11_GO_LIVE_CHECKLIST.md` and return only unresolved owner actions.

When complete, return:

- what changed
- routes and components changed
- migrations if any
- test results
- title-leak audit result
- screenshots or recordings of the signature motion sequences
- remaining external actions only
