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

## Verified in this build, for the record

These need no action — noting them so they are not re-litigated:

- `npm run lint`, `npm run typecheck`, `npm run test` (44 unit tests),
  `npm run build` and `npm run cf:build` all pass.
- Playwright: 21 passing (public site, PWA installability, spoiler
  regression, auth gating on all five protected route groups). 13 are
  skipped and self-document why — each needs the live Supabase project
  from item 1 and an authenticated session.
- All public pages checked at a 390px viewport.
- `POST /api/cron` rejects both a missing and an incorrect bearer token.
- `/tonight`, `/circle`, `/library`, `/you`, `/desk` all redirect to
  `/join` when signed out.
