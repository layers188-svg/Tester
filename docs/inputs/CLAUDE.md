# CLAUDE.md

## House Dark build instruction

Read this file first, then `README_START_HERE.md`, then `docs/00_BUILD_BRIEF_FINAL.md`.

This handover supersedes the older Claude Code brief in `source_material/` whenever the two conflict. The older files remain useful for product depth, data modelling and brand history.

### The non-negotiable product rule

House Dark protects a film's identity until the member has deliberately completed the reveal ritual.

Before reveal, the film title must not exist in the client response, DOM, metadata, accessibility strings, analytics payload, notification copy, deep-link preview, asset filename or logs visible to the member.

Do not hide a title with CSS. Withhold it at the data boundary.

### The build target

Build the current House Dark web product inside the existing repository. Do not replace a working backend, auth system, database or deployment stack because a different stack is easier. Inspect the repo first. Preserve working production capabilities.

The latest product architecture is:

1. Tonight
2. Search, which is actually a trust-based recommendation ritual
3. Circle
4. Library
5. The Room, opened only after watching
6. Me or You settings, if already present in the repo

The primary experience is phone first. Desktop widens the same hierarchy. It must not become a dashboard.

### Source of truth order

1. `CLAUDE.md`
2. `docs/00_BUILD_BRIEF_FINAL.md`
3. Files in `docs/`
4. `data/product-state-machine.json`
5. `docs/09_FILM_LIBRARY_500.md`
6. `docs/10_SAMPLE_VIDEO_ASSETS.md`
7. `qa/ACCEPTANCE_TESTS.md`
8. `prototype_reference/house_dark_v15_preferred_visual_reference.html`, preferred visual and interaction direction
9. `prototype_reference/V15_DESIGN_RESEARCH.md`, visual rationale
10. `source_material/HOUSE_DARK_BRAND_BOOK.md`
11. `source_material/House_Dark_Project_Handover.docx`
12. `source_material/House_Dark_UI_Handoff.pptx`
13. `prototype_reference/house_dark_v13_reference.html`, historical behaviour reference only
14. `source_material/House_Dark_Claude_Code_Build_Brief_PREVIOUS.md`, historical implementation detail only

### Working rules

- Inspect the current repository before changing code.
- Run the app and establish a baseline.
- Work in small logical commits if Git is available.
- Lint, type check and run critical tests after each major feature.
- Do not ask the owner to perform coding or routine setup you can complete.
- Ask only for genuinely external actions such as a missing secret, platform account, DNS or final subjective approval.
- Never ask for passwords, one-time codes or secrets in chat.
- Reuse approved SVG logo assets from `brand_assets/`. Never rebuild the logo with text.
- Do not ship prototype fixture data as real user data.
- Import and use `data/house_dark_500_films.json` as the finite Trust Us recommendation corpus. Do not build an endless member-facing recommendation repository.
- External movie APIs may enrich known records or support deliberate Library exact-title add, but they may not create arbitrary Trust Us candidates.
- The actual production repository is expected to already contain six supplied sample videos. Inventory them before asking the owner for media.
- Treat V15 as the preferred visual prototype. Do not rebuild the later V16 control experiment as the target design.
- Do not copy the prototype implementation wholesale. Recreate the behaviour cleanly in the production architecture.
- Do not add features that weaken the unknown.

### Absolute visual rules

House Dark is cinematic through darkness, typography, light, timing and material contrast. It is not cinema-themed decoration.

Avoid popcorn, tickets, red carpets, velvet, reels, clapperboards, projector icons, Art Deco pastiche, neon, glassmorphism, poster walls, streaming grids, ratings, scores, popularity modules, follower counts and generic SaaS cards.

No copyrighted film posters, actor imagery, studio stills, existing trailer footage or recognisable film scenes before reveal.

### Motion rule

Do not animate pages. Transform the House.

Important objects persist and become the next state. A fade alone does not count. Motion must be visible at normal viewing speed and must explain state, focus, reveal, sealing or spatial relationship.
