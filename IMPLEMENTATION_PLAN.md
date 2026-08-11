# Implementation plan — House Dark Founding Beta

Source of truth: `docs/HOUSE_DARK_BUILD_BRIEF.md`. This plan is the short,
working translation of brief §19 into repo reality.

## Phase 1 — Inspect and stabilise (this commit)

The repository was empty (no commits, no assets, no prior product code).
There was nothing to preserve. Scaffolded a fresh Next.js 16 App Router
project (TypeScript strict, no UI kit) and wrote this plan plus
`CLAUDE.md`. No real seed photography, No Trailer footage, or logo source
were supplied in this environment — clearly named, empty content slots are
used instead (brief §2, §23) and the gap is logged in
`LAUNCH_CHECKLIST.md`.

## Phase 2 — Foundation

- Design tokens (`src/styles/tokens.css`), self-hosted Newsreader /
  Barlow Condensed with system fallbacks, base global styles.
- Env validation module (`src/lib/env.ts`) — fails fast and never leaks
  the service role key to the browser.
- Supabase browser/server/service clients.
- SQL migrations for every table in brief §10, with RLS policies for
  every table (brief §11), generated TypeScript types.
- Public site: Home, How it works, Join/sign in, Terms, Privacy, Film
  rights and service disclaimer.
- Email OTP sign-in (six digit code, Supabase Auth).

## Phase 3 — Core opening

- Tonight page and all nine required states.
- Explicit dimming gesture, No Trailer player (native `<video>`,
  `playsInline`, no browser controls, custom progress, replay, retry,
  reduced motion, never reveals title as an error fallback).
- Server-only reveal route: verifies member, writes `reveals`, only then
  returns title/year/providers. Never prefetched or statically built.
- Provider handoff (text only, no logos), save/watch states.
- Six words (server + client enforced, blurred until eligible, 5 minute
  edit window, delete anytime, owner moderation), After Credits.

## Phase 4 — Circle and Library

- Circle create/join (invite code + private link), leave, remove member.
- Send under seal to one friend or Circle members; recipient reveal flow
  mirrors Tonight's reveal security model.
- Shared screenings with Thursday 8pm default, attendance responses.
- Circle activity feed (safe — "watched" / "sent", never a sealed title).
- Library: Yours / Circle / The House, eligibility-gated search, no
  poster wall, no star ratings, no popularity sorting.

## Phase 5 — Programming Desk and automation

- Opening CRUD, media upload with UUID storage names + validation,
  sealed/reveal preview, human approval gate, scheduling.
- Provider destination management per territory.
- `notification_queue` + Cloudflare Cron-triggered worker route
  (guarded by `CRON_SECRET`) for opening state transitions, nightly
  email, sealed recommendation email, screening reminders, After Credits
  prompts, retries with a cap.
- Review moderation (hide, not silently rewrite).

## Phase 6 — Launch readiness

- PWA manifest + service worker (installable, never caches secret
  responses).
- Accessibility pass (WCAG 2.2 AA core flows), reduced motion, focus
  states, captions slot for No Trailer audio.
- Vitest unit suite (six-word count, cue validation, email sanitisation,
  title leak detector, opening state transitions, After Credits
  eligibility, marketing consent).
- Spoiler regression suite using the seeded `Whiplash` string.
- Playwright critical journeys (brief §17).
- Cloudflare adapter + deploy config, `README.md`, `OPERATIONS.md`,
  `LAUNCH_CHECKLIST.md`.

## What is genuinely blocked on Logan

Tracked live in `LAUNCH_CHECKLIST.md`; summary: a real Supabase project,
a Resend account + verified sending domain, a Cloudflare account, a
domain, the approved logo source file, and the real seed night
photography/No Trailer footage. Everything else proceeds autonomously.
