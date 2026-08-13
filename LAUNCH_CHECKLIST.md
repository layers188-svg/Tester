# Launch checklist

Only unresolved actions that **cannot be completed from code**. Everything
buildable has been built — see `IMPLEMENTATION_PLAN.md` for what shipped.

Each item says exactly what to do, not a general setup lecture.

---

## 1. Supabase project — blocks everything

Nothing touching the database, auth or storage can be verified until this
exists. The schema, RLS policies, functions and seed are written and
waiting.

**Do:** create a project at supabase.com, then from the repo root:

```bash
npx supabase link --project-ref <ref>
npm run db:migrate
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

The Supabase CLI is now a devDependency, so `npx supabase` works after
`npm install` — nothing to install globally.

**Then give me:** `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

> `src/lib/supabase/types.ts` is currently hand-written to match the
> migrations exactly. Regenerating it against the real project is the
> only way to guarantee it never drifts.
>
> Run that `gen types` line on a machine with Docker. The CLI generates
> types by running `postgres-meta` as a container, which the build
> environment here cannot pull (see "Environment constraints" below), so
> it is the one step in this item I cannot do for you even once the
> project exists.

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

## 3. Cloudflare account — done, and deployed

Logan created the account and supplied a scoped API token. Both workers
are live on the free `workers.dev` hostname, no domain purchased:

|             |                                                                    |
| ----------- | ------------------------------------------------------------------ |
| App         | `https://house-dark.layers188.workers.dev`                         |
| Cron worker | `house-dark-cron`, schedule `*/5 * * * *`                          |
| Account     | `8821d10d5ea2e65f91305374fe0d6e20`                                 |
| Secrets set | all eight on the app, `APP_URL` + `CRON_SECRET` on the cron worker |

Two things that follow from this:

- **The deploy token is in the session transcript. Delete it**
  (My Profile → API Tokens → `house-dark-deploy`) once there is a
  reason to deploy again, and make the next one with a TTL.
- **The build environment cannot reach `*.workers.dev`** — egress policy
  refuses the CONNECT with a 403. So the platform state below was
  verified through the Cloudflare API, and whether a page actually
  renders can only be confirmed from a browser outside this
  environment. Not a deployment fault, but it does mean I cannot run
  the Playwright suite against the live URL the way I ran it against
  the local build.

For reference, the original instructions:

**Do:** create/provide access to the Cloudflare account, then:

```bash
npx wrangler login
npm run cf:build && npm run cf:deploy
cd workers/cron && npx wrangler deploy    # after setting its two secrets
```

The account is free and needs no domain and no card — see
`docs/PREVIEW_DEPLOY.md`, which walks the whole deploy on a free
`workers.dev` address. One caveat recorded there rather than discovered
later: the Workers **free** plan allows 10 ms of CPU per request, which
server-rendering a dynamic route may exceed. If it does, the symptom is
"Worker exceeded CPU time limit" and the fix is the $5/month Workers
Paid plan. Free is the right place to start; it is just not guaranteed
to be the place you stay.

---

## 4. Domain — deferrable, and worth deferring

Not needed to run the product. Cloudflare gives every account a free
HTTPS hostname (`house-dark.<your-subdomain>.workers.dev`), and the app
has no hardcoded origin: the manifest is fully relative, `metadataBase`
and every email link derive from `NEXT_PUBLIC_APP_URL`, and sign-in is a
six-digit code with no redirect URL to allowlist. So the whole signed-in
product runs on a free address, phone install included.

`docs/PREVIEW_DEPLOY.md` is the exact sequence.

What the domain **is** needed for is item 2: Resend will not deliver to
arbitrary recipients from an unverified domain. Testing alone works
without it (Supabase's built-in email, or Resend's
`onboarding@resend.dev`, both of which reach your own address only).

**So the trigger for buying is inviting a second person, not
deploying.** Candidate name in "Open design decisions" below.

**Do, when that moment comes:** purchase it, connect it to the
Cloudflare Worker, and change the four values listed at the end of
`docs/PREVIEW_DEPLOY.md`. No code change.

---

## 5. Logo — done

Logan supplied the approved wordmark and HD monogram, each in ink and
inverse. All four are in `public/brand/` as the source of record.

One thing worth knowing: the wordmark SVG sets the type in `<text>`
with `font-family="Newsreader"`, and an SVG carries no font. Used as an
image or a favicon it renders in whatever serif the client has, which
is not the identity. So the wordmark is set as HTML text against the
self-hosted face, and the monogram — which is paths, not text — drives
the app icon and favicon. Both were checked by rendering, not assumed.

Aligning the header to the artwork changed four things the placeholder
had wrong: the wordmark is uppercase, weight 400, negatively tracked,
and a single ink colour. The placeholder had set DARK in brass, which
the approved artwork does not.

---

## 6. Seed night photography

The seed No Trailer has been supplied and is committed as
`tests/e2e/fixtures/sample-no-trailer.mp4` — deliberately renamed,
because the original filename described the footage closely enough to
point at the protected title. See that directory's README. What is left:

- The seeded opening still points at a placeholder storage path. Upload
  the real file through the Programming Desk before running the opening;
  the Desk rewrites it to a UUID object name so the stored path carries
  no meaning.
- The home page hero, the Circle product capture and the ritual section
  use empty, clearly named content slots. They contain **no** stock
  photography and **no** generated people, per brief §2 — they stay empty
  until real photography of real members exists.

---

## 7. Legal review — done

Passed. The "Draft — pending review" line is gone from `/terms`,
`/privacy` and `/film-rights`, replaced by a review date.

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

- **The HD ligature.** Supplied as vector and installed — see item 5.
- **Domain candidate:** `housedark.club`, with `hello@housedark.club`
  and `@housedark.club`. Item 4 above has a name to buy.
- **Palette.** The seven brief §8 colours were verified against the
  guidelines and match exactly. Deep Burgundy `#741724`, Tobacco
  `#956433` and Dust Rose `#A88187` have been added to
  `src/styles/tokens.css`.

---

## Verified in this build, for the record

These need no action — noting them so they are not re-litigated:

- `npm run lint`, `npm run typecheck`, `npm run test` (153 unit tests),
  `npm run build` and `npm run cf:build` all pass.
- `npm run test:rls` — 134 assertions against a throwaway Postgres with
  every migration applied. Covers all seven brief §17 cases, Library
  title gating, and that no protected title reaches a member-readable
  column. This is what proves a policy holds; RLS filters rows rather
  than raising, so a test that only looked for an error would pass
  while leaking everything.
- Playwright: 95 journeys — 82 passing (public site, PWA installability,
  spoiler regression, auth gating on all five protected route groups),
  13 skipped. The skipped ones self-document why: each needs a live
  Supabase project and an authenticated session.
- The signed-in product has now been run against the real project.
  93 of 99 journeys pass, including Tonight sealed/dim/reveal, the
  provider handoff, six words, After Credits, Circle creation and
  joining, sending under seal, account deletion, and a Desk upload that
  put a real file into Supabase Storage. Six are skipped: two need
  working SMTP (item 2), four are the screenshot captures, which only
  run with `CAPTURE=1`.
- Two faults in the test suite itself, found by running it rather than
  reading it, are fixed:
  - The two account-deletion journeys shared one persona and ran in
    parallel, so the account-deletion test could delete the account the
    review-deletion test was using. It passed or failed on worker
    scheduling. That describe block is now `mode: "serial"`.
  - An exported-but-empty `PLAYWRIGHT_BASE_URL` set `baseURL` to `""`
    while still starting a local server, and setup died with
    "TypeError: Invalid URL" pointing at a cookie domain — a message
    that named nothing relevant. Empty now means unset.
- Those runs create member accounts and content, which brief §18
  forbids in production, so they only run with `E2E_DESTRUCTIVE_OK=1`
  and the teardown removes everything and verifies it afterwards.
  Logan authorised running against the real project while it is still
  empty; once real members exist, point it at a second project instead.
- The Cloudflare Workers bundle has been run, not just built. `npm run
cf:preview` serves it in workerd, and all 93 journeys pass against
  that bundle with real Supabase behind it — so what is left in item 3
  is an account and a deploy, not an unknown.
- `npm run smoke:remote` — 16 read-only checks against the hosted
  project. The browser's own anon key returns zero rows from `films`,
  `opening_secrets`, `playback_destinations` and `analytics_events`.
- All public pages checked at a 390px viewport.
- Form errors are announced and tied to the field that caused them
  (§16 accessibility rule 8). Fixing that turned up a real bug on the
  You page: it never checked whether a save succeeded, so a rejected
  change still said "Saved" and a refused toggle stayed switched. That
  mattered most for marketing consent, which is a record of what a
  member agreed to, and for the timezone that decides when their
  nightly email is sent.
- Brief §15 analytics is built and is first party — no third party
  provider to sign up for, nothing to add to item 1-4. The twelve events
  record into this project's own database and read back at
  `/desk/analytics`. Worth knowing for the privacy policy review in item
  7: there is no analytics cookie and no data leaves the project.
- `POST /api/cron` was run through the Workers bundle against the real
  project: 401 on a missing token, 401 on a wrong one, and a full report
  on the correct one. That is the endpoint the scheduled worker calls,
  so item 3's remaining risk is the deploy, not the job.
- `/tonight`, `/circle`, `/library`, `/you`, `/desk` all redirect to
  `/join` when signed out.
- Nothing in the app hardcodes a domain, so it runs on a free
  `workers.dev` address with no purchase — see item 4 and
  `docs/PREVIEW_DEPLOY.md`. The one exception has been removed: email
  links fell back to `https://housedark.app`, a domain this project does
  not own, read once at module load. A missing `NEXT_PUBLIC_APP_URL`
  would have sent members to a stranger's website rather than failing.
  It now has no fallback and is read per render.
- The sender address in `.env.example` — `RESEND_FROM_EMAIL="House Dark
<hello@yourdomain.com>"` — now actually boots the app. Validation used
  to demand a bare address, so setting the documented value made the app
  refuse to start with "missing or invalid environment variable(s):
  RESEND_FROM_EMAIL". Both shapes are accepted and pinned by tests. This
  would have bitten on item 2, at the exact moment you pasted the real
  value in.

---

## Environment constraints on the build sessions

Recorded so it is not re-derived every session, and because it changed:

- The Supabase, Resend and Cloudflare **APIs are reachable** from the
  build environment, along with GitHub and npm. An earlier session found
  them blocked and said so in `.github/workflows/ci.yml`; that is no
  longer true and the comment has been corrected.
- **Container images cannot be pulled.** Docker Hub's blob CDN
  (`production.cloudfront.docker.com`) and AWS ECR's
  (`d2glxqk2uabbnd.cloudfront.net`) are both refused by egress policy —
  manifests resolve, blobs return 403. The Docker daemon itself runs
  fine. This rules out `supabase start` (the whole local stack) and
  `supabase gen types`, which runs `postgres-meta` as a container.
- What that costs: the 13 skipped Playwright journeys stay skipped. They
  need a running auth server to mint a real session, and with no local
  stack and no hosted project there is nowhere to get one. This is
  waiting on item 1, not on code.
- What still works natively, and was run: every migration applied to a
  local PostgreSQL 16 with all 107 RLS assertions passing, the full unit
  and spoiler suites, the production build, and the 79 Playwright
  journeys that do not need a session.
