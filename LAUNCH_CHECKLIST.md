# Launch checklist

Only unresolved actions that **cannot be completed from code**. Everything
buildable has been built — see `IMPLEMENTATION_PLAN.md` for what shipped.

Each item says exactly what to do, not a general setup lecture.

---

## 0. No Trailers for the House Dark 500

The catalogue arrived and is in: twenty territories, 500 films, each
with its six-word line (`data/house-dark-500.json`, imported by
0018_house_dark_500.sql). Trust Us runs on it.

One film has a No Trailer — the seed picture, attached to the film it
was made for by 0020_film_no_trailers.sql. The other 499 have none, and
the Library shows nothing for them rather than borrowing that one and
presenting it as theirs.

**Do:** upload No Trailers through the Programming Desk as they are
made. The Desk already rewrites each to an opaque object name and the
Library picks it up with no code change.

Two files currently sit in `public/film-videos/` because there is no
Storage bucket to hold them yet. Once item 1 exists they move, and the
only thing that changes is a column.

### A metadata provider, if you want one

`add_library_film()` takes a title and a year, which is enough for a
member adding a film the catalogue does not have. A provider search
would replace those two inputs with a lookup. It needs an account and a
server-side key (TMDB is the usual choice) — say the word and it slots
in ahead of the same call.

---

## 1. Supabase project — blocks everything

Nothing touching the database, auth or storage can be verified until this
exists. The schema, RLS policies, functions and seed are written and
waiting.

**Do:** create a project at supabase.com, then from the repo root:

```bash
supabase link --project-ref <ref>
npm run db:migrate
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

**Then give me:** `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

> `src/lib/supabase/types.ts` is currently hand-written to match the
> migrations exactly. Regenerating it against the real project is the
> only way to guarantee it never drifts.

---

## 2. Resend account and verified sending domain

Supabase's shared SMTP will throttle a public beta to a trickle. Auth
codes are the first thing a new member sees.

**Do:** create the Resend account, verify the sending domain (DNS records
on the domain from item 4), create an API key, then set it as Supabase
custom SMTP — `smtp.resend.com`, port `465`, username `resend`, password
= the API key. Details in `OPERATIONS.md` § "Resend as Supabase custom
SMTP".

**Then give me:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

---

## 3. Cloudflare account

The build already produces a working Workers bundle (`npm run cf:build`
succeeds). It has not been deployed because there is no account to
deploy to.

**Do:** create/provide access to the Cloudflare account, then:

```bash
npx wrangler login
npm run cf:build && npm run cf:deploy
cd workers/cron && npx wrangler deploy    # after setting its two secrets
```

---

## 4. Domain

The likely first unavoidable cost. Needed for the Resend sending domain
(item 2) and for `NEXT_PUBLIC_APP_URL`.

**Do:** purchase it and connect it to the Cloudflare Worker.

---

## 5. The approved House Dark logo source

No logo file was supplied to this environment. `src/components/Wordmark.tsx`
currently sets the wordmark typographically (Newsreader, with "Dark" in
italic brass), and `public/brand/mark.svg` drives the PWA icons from the
same treatment.

**Do:** supply the approved wordmark and intertwined HD ligature as SVG.
Only two files reference the identity — `Wordmark.tsx` and
`public/brand/mark.svg` — so swapping it is a contained change.

---

## 6. The real No Trailer file and seed night photography

`The Drummer's Solitary, Silent Prelude.mp4` was referenced in the brief
but not supplied here, so:

- The seeded opening points at a placeholder storage path. Upload the
  real file through the Programming Desk before running the opening.
- `tests/e2e/fixtures/sample-no-trailer.mp4` is missing, so the Desk
  upload journey cannot run end to end. Any short non-sensitive MP4
  unblocks it.
- The home page hero, the Circle product capture and the ritual section
  use empty, clearly named content slots. They contain **no** stock
  photography and **no** generated people, per brief §2 — they stay empty
  until real photography of real members exists.

---

## 7. Legal review

`/terms`, `/privacy` and `/film-rights` are written in plain language and
carry the required service disclaimer verbatim, each marked as a draft
pending Australian legal review.

**Do:** have them reviewed before any broad public launch, then remove
the "Draft — pending review" line from all three pages.

---

## 8. Member-facing content decisions

- The public home page currently shows four **clearly labelled beta
  demonstration** six-word responses, because no approved real ones
  exist yet. As soon as real members post and you approve them in
  `/desk/moderation`, the page switches to those automatically and the
  demonstration label disappears. No fabricated testimony is used
  anywhere.
- Verified provider links for the seed film are placeholders and marked
  unverified. Replace and verify them before that opening runs.

---

## Open design decisions from the Brand Guidelines

The Brand Guidelines v1.0 deck and the app mockups resolve some things
and contradict others. Where they conflict with
`docs/HOUSE_DARK_BUILD_BRIEF.md`, the brief has been kept and the
conflict recorded here rather than silently resolved. Each needs a
decision from Logan.

1. **Theme.** The mockups show Library and Circle on Stock Cream, and
   Opening / No Trailer / Reveal on Projection Black. The build is
   entirely dark. Options: keep dark-only; go two-toned as mocked (dark
   for the ritual, paper for the reflective surfaces); or invert to
   cream-first. Two-toned or cream-first touches every CSS module and
   needs a second WCAG AA contrast pass.

2. **Navigation.** Brief §5 mandates exactly four tabs — Tonight,
   Circle, Library, You — and "do not add a fifth tab." The four
   mockups show four _different_ navigations, three with five tabs, and
   none matching the brief or each other:
   - Home / Programme / Library / Circle / Profile
   - Home / Discover / Library / Profile
   - Home / Archive / Circle / Lists / Profile
   - Opening / Films / Library / Lounge / Profile

   The brief's four are what is built.

3. **Imagery in Library and Circle.** The mockups show film stills
   (_Stalker_, _In the Mood for Love_, _The Sweet Hereafter_, _The Piano
   Teacher_) and photographic member avatars. Brief rule 8 forbids
   third-party film imagery outright, and the guidelines' own "WHAT WE
   AVOID" panel rules out generated people. The same mockups also use
   velvet curtains, a spotlight, and clapperboard/curtain nav icons,
   all of which that panel lists as avoided. Built as typographic, with
   no imagery. If real stills are wanted, that needs written
   confirmation the rights are cleared.

4. **"House Member — a subscriber to House Dark."** The guidelines'
   product-language table defines it that way; brief §3 and working
   rule 6 forbid any payment or subscription in this release. Assumed
   to be vocabulary only, not intent.

5. **No Trailer duration.** The guidelines say 10–10.5 seconds; the
   brief says 8–12 preferred. The media validator uses the brief's
   8–12 and warns outside it.

Resolved by the guidelines, no longer blocking:

- **The HD ligature exists.** Still need the **vector source** (SVG or
  AI) — a render is not enough to ship. `src/components/Wordmark.tsx`
  is a typographic placeholder and is the only place to change.
- **Domain candidate:** `housedark.club`, with `hello@housedark.club`
  and `@housedark.club`. Item 4 above has a name to buy.
- **Palette.** The seven brief §8 colours were verified against the
  guidelines and match exactly. Deep Burgundy `#741724`, Tobacco
  `#956433` and Dust Rose `#A88187` have been added to
  `src/styles/tokens.css`.

---

## Verified in this build, for the record

These need no action — noting them so they are not re-litigated:

- `npm run lint`, `npm run typecheck`, `npm run test` (129 unit tests),
  `npm run build` and `npm run cf:build` all pass.
- `npm run test:rls` — 107 assertions against a throwaway Postgres with
  every migration applied. Covers all seven brief §17 cases, Library
  title gating, and that no protected title reaches a member-readable
  column. This is what proves a policy holds; RLS filters rows rather
  than raising, so a test that only looked for an error would pass
  while leaking everything.
- Playwright: 92 journeys — 79 passing (public site, PWA installability,
  spoiler regression, auth gating on all five protected route groups),
  13 skipped. The skipped ones self-document why: each needs a live
  Supabase project and an authenticated session. Unskipping them needs a
  global setup that mints a real session, which is not written yet — the
  schema now exists, but a session does not.
- All public pages checked at a 390px viewport.
- `POST /api/cron` rejects both a missing and an incorrect bearer token.
- `/tonight`, `/circle`, `/library`, `/you`, `/desk` all redirect to
  `/join` when signed out.
