# CLAUDE.md — House Dark

House Dark is a phone first, invitation friendly Founding Beta: a private
picture house that opens one human chosen film each night through a short,
original, spoiler safe "No Trailer." Friends also send films to each other
under seal. Product shorthand: **one film, a few friends, nobody knows.**

Full product spec lives in `docs/HOUSE_DARK_BUILD_BRIEF.md`. Read it before
making product decisions. This file is the condensed operating contract.

## What this is not

Not a streaming service, film catalogue, review database, ratings product,
recommendation algorithm, infinite feed, poster wall, or fake luxury club.
Never reinterpret the product as one of these.

## Working rules

1. Build the real application. Never stop at a visual prototype.
2. No dead buttons, no placeholder navigation.
3. Never claim a feature works without testing it.
4. Never substitute fake data for a backend feature and call it complete.
5. Never generate people, reviews, or social proof. Use clearly named,
   empty content slots until real photography/footage is supplied.
6. No payment system in this release.
7. Do not reopen the name or brand direction.
8. No film posters or third party film imagery, ever.
9. Never expose protected title/film data to the client before reveal —
   see "Spoiler security" below before touching anything opening-related.
10. Keep dependencies minimal and justified.
11. Use SQL migrations for every database change (`supabase/migrations`).
12. Keep TypeScript strict and resolve all errors — no `any` escape hatches.
13. Run `npm run format`, `npm run lint`, `npm run typecheck`, and
    `npm run test` before considering any change complete.
14. Check every route and back navigation at a 320–430px viewport.
15. Commit complete logical units with clear messages.
16. Continue autonomously until an external account, credential, DNS
    change, or legal decision is genuinely required. When blocked, state
    the smallest exact action needed — never a generic setup list.

## Spoiler security (non-negotiable)

Before reveal, a film's title/identity must never appear in: server
rendered HTML, client JS payloads, network responses, storage paths,
filenames, video/poster metadata, URLs, Open Graph tags, notifications,
email subject/preview text, analytics events, error messages,
accessibility labels, browser history, logs, or cached service worker
responses.

- `films`, `opening_secrets`, and `playback_destinations` are owner /
  service-role only. The browser only ever gets a safe projection.
- The only path from "sealed" to "revealed" is the server-side reveal
  route (`src/app/api/reveal/*`), which verifies the member, writes a
  `reveals` row, and only then returns title/year/providers.
- Never prefetch or statically generate a reveal route.
- Guard **data, not rendered output**. A rendered page or email is
  `template(constant copy, dynamic data)`; only the data can acquire a
  title at runtime. The detector matches case-insensitive substrings, so
  scanning rendered output blocks any short title — a film called _It_
  matches `initial-scale`, _Up_ matches `uppercase`, _Us_ matches
  `House`. On a live path use `assertSafeEmailData` (word-boundary,
  scans template inputs); keep `assertSafeEmailPayload` for the
  regression suite, where over-triggering is the point.
- A `TitleLeakError` message names **where** a leak is, never **what**
  leaked. It is thrown when a title is somewhere sensitive and is the
  thing most likely to be logged or persisted —
  `notification_queue.last_error` is member-readable. Never persist,
  log, or return `error.leaks`.
- A spoiler rejection is permanent, not transient. Fail it on the first
  attempt and surface it; never retry it.
- Run `npm run test:spoiler` (title leak detector) whenever opening,
  reveal, email, or seed code changes.
- Run `npm run test:rls` whenever anything under `supabase/migrations`
  changes. It applies every migration to a throwaway Postgres and
  asserts all seven brief §17 cases — the only thing that actually
  proves a policy holds, since RLS filters rows rather than raising.

## Stack

Next.js App Router (TypeScript strict) · custom CSS (CSS Modules + design
tokens, no component library) · Supabase (Postgres, Auth OTP, Storage,
RLS) · Resend (custom SMTP + operational/editorial email) · Cloudflare
(Pages/Workers deploy target) · Vitest (unit) · Playwright (critical
journeys).

## The Room (the sequence is the product)

Watch → Mark watched → leave your six words → submit → the room opens
→ read everyone else. **A member must never see another member's
response before their own is on record.** The product exists so someone
can meet a film before outside opinion reshapes it.

- Enforced three times over, deliberately: `can_view_six_word_review`
  (RLS), `get_after_credits` (0017, returns zero rows to a member who
  has not published), and `/room/[openingId]` redirecting on
  `has_published`. The UI never decides this on its own.
- `get_after_credits` returning nothing is ambiguous by design (shut
  room or empty room). `get_room_opening` (0020) exists because the
  Room page has to tell those apart, and it reads the title without
  writing a reveal the way `/api/reveal/*` does.
- The response screen shows **nobody else's words**. Anything that
  lists other members belongs behind the submit.
- A member may **skip** ("Not this time"). Skipping records nothing
  and opens nothing: the Room stays shut. The rule is that your words
  come before anyone else's, not that you are obliged to have any.
  Offer it below the primary action, never beside it.
- Once a member has revealed, `/tonight` serves **The House**
  (`src/components/house/TheHouse.tsx`) instead of the reveal card:
  same route, a state of the evening rather than a place. One hero
  action matched to where the member has got to, the Room second, then
  anything under seal, Search, Library, next opening. The House is the
  only route back to a member's own words, so it must keep carrying
  "Change your words" into `/opening/[openingId]` — edit and delete
  live there and nothing else links to them.
- The member's six words are one object across the whole sequence
  (`view-transition-name: hd-my-six-words`), which is why the Room
  server-renders the member's own row rather than waiting for
  `/api/after-credits`. Only other people's words are worth a wait.
- The Room has no likes, hearts, scores, stars, replies, sorting,
  rankings, trending, avatars or follower counts, and never will. Those
  mechanics manufacture consensus, which is the thing House Dark is
  built to resist. Response scale varies only by position
  (`:nth-child`), never randomly.

## Search (six words before)

**Know enough to choose. Nothing enough to spoil it.** A member types a
title and gets the House Dark version: an exactly-six-word premise,
three territory words, a pace and an intensity. Never a synopsis, a
rating, a poster or a cast list.

- "Six words before the picture" (the house describes a film) and "six
  words after the picture" (a member answers one) are related product
  language and **separate systems**. `film_records` is the first,
  `six_word_reviews` the second; they never share a table.
- `film_records` is **not** `films`. `films` holds what an opening is
  sealing and is never member-readable; `film_records` is spoiler-safe
  by construction and readable by any member. Keep them apart.
- Exactly six words is enforced three times: `validateEditorial`, the
  `film_records_six_words` check constraint, and a retry when the model
  miscounts. Never pad or trim a premise to reach six.
- The source synopsis lives only in `FilmFacts` on the server. It is
  input to the editorial engine and must never reach a response.
- One description per film for the whole house — that is the point of
  caching, not a performance trick.
- The index is the house's own 62 films first, then a wide catalogue:
  TMDB when `TMDB_API_KEY` is set, otherwise Wikidata, which needs no
  account, no key and no payment. `HOUSE_DARK_WIDE_CATALOGUE=off`
  pins Search to the 62. The composition in `provider.ts` is
  deliberate: a hand-written six words beats a generated one, and the
  catalogue is also the floor under a wide provider that fails.
- **`src/lib/films/wikidata.ts` has never reached the live endpoint.**
  It was written without outbound network, so its parsing is tested
  against hand-written payloads and its assumption about the API's
  shape is not tested at all. Record real responses on a machine with
  network before trusting it. The e2e suite runs with the wide
  catalogue off for the same reason plus a better one: a journey that
  depends on a third party being up stops meaning anything.
- Both outside services are optional. Without `ANTHROPIC_API_KEY`
  Search serves only films already written up, whatever the index
  knows. Neither key is `NEXT_PUBLIC_`.

## Signed-in navigation

Five tabs: **Tonight, Search, Circle, Library, Me.** Search was added
by direction on 14 August because it genuinely could not live inside
the others. Don't add a sixth.

The last tab is labelled "Me" but still routes to `/you`. The label was
changed by direction on 13 August; the route was not, because renaming
it would break bookmarks and the signed-out redirects that point there.
Tests must map label to route explicitly rather than lowercasing the
label.

## Interface copy

No em dashes in anything a member reads. Recast the sentence rather
than substituting a hyphen. Comments and docs are unaffected.

## Brand

Colours, type (Newsreader / Barlow Condensed) and animation timings are
fixed in `src/styles/tokens.css` — see the brief §8. Brass is a minor
registration colour, not a luxury effect. No glassmorphism, neon,
gradients, generic component styling, or stock/generated people.

## Imagery (copyright, non-negotiable)

Never introduce film posters, screenshots, stills, promotional or actor
photography, or studio artwork. House Dark makes its own visual
interpretation of every film: original abstract imagery, bespoke No
Trailer frames, light, texture, typography, spoiler-safe objects,
material studies, original graphic composition.

Before the title is known, House Dark owns the visual. After the
reveal a film may influence the visual language, but only through
original House Dark assets. A Library entry gets a flat palette spine
(`EntryField`), never a thumbnail; a sealed one gets an empty frame,
because the colour is derived from the row id and giving a sealed row
one would mean the page knew something it may not know.

## Motion vocabulary

Six verbs, defined in `src/styles/tokens.css` and mirrored in
`src/lib/motion.ts`. Everything that moves is one of them; if a new
animation is none of them, it is decoration and does not belong.

- **DIM** — the room around the clue goes dark. The shell obeys it via
  `HouseLights` + `.hd-dimmable`, and dimmed chrome is also `inert`.
- **FOCUS** — the clue frame expands to become the dominant object.
- **PLAY** — ten seconds, no conventional player chrome. The sound and
  reduced-motion controls stay: they are accessibility, not transport.
- **HOLD** — a deliberate pause at a moment that earns one.
- **REVEAL** — the page transforms into the answer; a brass rule draws
  and the title wipes in behind it. Never a navigation to a results
  screen.
- **SEAL / UNSEAL** — `SealMark` moves between closed and broken. The
  same object in both states, never two graphics swapped.

Slow, confident, restrained. No fade-up-on-scroll, parallax, floating
cards, bouncing UI, or WebGL spectacle.

Three ordinary speeds sit under the six verbs: `--hd-motion-fast`
(180ms, a control answering a touch), `--hd-motion-standard` (320ms, a
piece of the page changing) and `--hd-motion-slow` (560ms, something
uncovered). Reach for a verb only when the movement is one of the six.

Motion happens because the member did something, never because they
scrolled, and it stops when the interaction does. The one permitted
loop is the rule on a loading button, and only while a request is
actually in flight.

Two rules that are easy to get wrong:

1. Timings live in **both** `tokens.css` and `motion.ts` because a
   sequence is half CSS transition and half `setTimeout`.
   `tests/unit/motion.test.ts` fails if they drift.
2. Staged entry uses `animation-fill-mode: backwards`, never `both`.
   With `both` the resting state before the animation starts is the
   `from` keyframe, so anything that stops the animation running leaves
   the content permanently invisible. Any `setTimeout` in a sequence
   goes through `motionDuration()` so reduced motion drops the pause as
   well as the movement.

## Commands

```
npm run dev          # local dev server
npm run build         # production build
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run format          # prettier --write
npm run test             # vitest unit tests
npm run test:spoiler      # title leak regression suite
npm run test:rls           # RLS policy tests (throwaway Postgres, needs a local server install)
npm run test:e2e            # playwright critical journeys (needs a running app + Supabase)
npm run db:migrate           # apply SQL migrations to the linked Supabase project
npm run db:reset:local        # DESTRUCTIVE: drops the LOCAL dev database, reapplies
                              # migrations, then runs supabase/seed.sql. Never aim
                              # this at a linked/remote project.
```

See `README.md` for setup, `OPERATIONS.md` for the daily opening workflow,
and `LAUNCH_CHECKLIST.md` for the only actions still waiting on Logan.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
