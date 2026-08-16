# Existing six sample videos

## Expected repository state

The working Claude Code repository should already contain **six House Dark sample videos** supplied during the prototype work.

Treat those six files as existing project assets.

Do not ask the owner to upload them again unless you have first searched the repository and can show that they are genuinely absent.

## First task

Before changing the media system:

1. Search the repository for `.mp4`, `.mov`, `.webm` and the existing No Trailer asset directories.
2. Produce an internal inventory of the six supplied sample videos:
   - current path
   - duration
   - dimensions / aspect ratio
   - file size
   - codec if readily available
   - current film or prototype mapping, if any
3. Confirm exactly which six are the supplied House Dark samples.
4. Add or update a repo-local asset manifest rather than hardcoding filenames throughout components.

If the repository contains more than six videos, distinguish the supplied six samples from unrelated media.

If fewer than six can be found, report the exact paths you searched and the exact missing count. Do not invent replacements.

## Security and title safety

No pre-reveal asset path should leak the protected film title.

If any of the six filenames contain titles:

- keep the original source file untouched if needed for provenance
- create an opaque production copy such as `HDNT-004.mp4`
- point the product at the opaque copy
- ensure URLs, manifests, logs, poster frames and analytics do not leak the title

## How to use the samples

The six sample videos are for:

- validating No Trailer playback
- testing distinct visual treatments
- verifying 10 second gating
- testing black hold and reveal timing
- testing mobile playback and failure states
- proving the motion system with real media

Do not treat the six samples as the entire future No Trailer catalogue.

The product database should connect a film/opening to an approved asset record.

## Human approval

A sample video is not automatically launch-approved because it exists in the repository.

Before public use each active No Trailer needs:

- spoiler check
- rights / ownership check
- no protected film footage or music
- no readable title or recognisable story clue
- human approval recorded
- opaque public filename

## Included handover media

The files under this handover's `media/` folder are references from earlier work. They do not replace the six assets already present in the actual Claude Code repository.
