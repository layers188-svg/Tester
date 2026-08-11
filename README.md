# House Dark

**One film. A few friends. Nobody knows.**

House Dark is a phone first private picture house. Each night it presents
one human chosen film through a short, original, spoiler safe _No
Trailer_ — only the emotional temperature, never the plot. The title is
revealed only after the member chooses to enter. Friends can also send
films to one another under seal. After watching, members leave six words,
and only then does the conversation open.

This repository is the **Founding Beta**: free, invitation friendly, with
no payment, subscription or trial clock.

- Product source of truth: [`docs/HOUSE_DARK_BUILD_BRIEF.md`](docs/HOUSE_DARK_BUILD_BRIEF.md)
- Working contract for contributors and agents: [`CLAUDE.md`](CLAUDE.md)
- Daily operating guide: [`OPERATIONS.md`](OPERATIONS.md)
- Remaining external actions: [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md)

---

## Stack

| Layer      | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Framework  | Next.js 16 App Router, TypeScript strict                   |
| Styling    | Custom CSS — design tokens + CSS Modules, no component kit |
| Data/auth  | Supabase (Postgres, Auth email OTP, Storage, RLS)          |
| Email      | Resend (Supabase custom SMTP + operational/editorial mail) |
| Hosting    | Cloudflare Workers via the OpenNext adapter                |
| Unit tests | Vitest                                                     |
| E2E tests  | Playwright                                                 |

---

## Local setup

Prerequisites: Node 22+, npm, and the [Supabase CLI](https://supabase.com/docs/guides/cli)
if you want a local database.

```bash
npm install
cp .env.example .env.local     # then fill in real values
```

### Environment variables

All eight are required (`src/lib/env.ts` validates them and fails fast
with the exact missing name). See `.env.example` for where each comes
from.

```
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY      # server only, never sent to the browser
RESEND_API_KEY
RESEND_FROM_EMAIL
ADMIN_EMAILS                   # promoted to the owner role on first sign in
CRON_SECRET                    # bearer token for POST /api/cron
```

> The `.env.local` currently committed to this working tree holds
> obviously fake placeholders so the app builds and the public-site tests
> run without a Supabase project. Replace them with real values — see
> `LAUNCH_CHECKLIST.md`.

### Database

```bash
supabase link --project-ref <your-project-ref>
npm run db:migrate        # applies supabase/migrations/*.sql
```

Migrations, in order:

| File                                  | What it does                                                        |
| ------------------------------------- | ------------------------------------------------------------------- |
| `0001_init.sql`                       | Enums, all 19 tables, indexes, `updated_at` and role-guard triggers |
| `0002_functions.sql`                  | Helper functions the RLS policies are built from                    |
| `0003_rls.sql`                        | Row Level Security on every table, plus the review-edit guard       |
| `0004_reveal.sql`                     | The reveal functions and safe projections                           |
| `0005_sealed_recommendations_rpc.sql` | Member-safe path to create a sealed recommendation                  |
| `0006_circle_helpers.sql`             | Circle member names and "my recommendations"                        |
| `0007_library.sql`                    | Library queries that gate titles on personal reveal                 |
| `0008_storage.sql`                    | The `no-trailer` and `avatars` buckets and their policies           |
| `0009_captions.sql`                   | Caption track slot for a No Trailer that carries speech             |

For local development with seeded demo data (including the protected
`Whiplash` example from brief §18):

```bash
npm run db:seed           # supabase db reset — LOCAL ONLY, never production
```

After linking a real project, regenerate the database types so they can
never drift from the schema:

```bash
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

### Run it

```bash
npm run dev               # http://localhost:3000
```

Design and test at a **320–430px** viewport first. Tablet and desktop
must remain usable, but the phone is the target.

---

## Commands

```bash
npm run dev            # dev server
npm run build          # production build
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run format         # prettier --write
npm run test           # vitest unit tests
npm run test:spoiler   # title leak regression suite only
npm run test:e2e       # playwright (starts its own dev server on :3100)
npm run cf:build       # build the Cloudflare Workers bundle
npm run cf:preview     # run that bundle locally in workerd
npm run cf:deploy      # deploy to Cloudflare
```

Run `format`, `lint`, `typecheck` and `test` before any handoff.

---

## Architecture notes

### Spoiler security is the core constraint

Before a member reveals a film, its title must not appear **anywhere** a
member could reach it — HTML, JS payloads, network responses, storage
paths, filenames, URLs, Open Graph tags, emails, analytics, error
messages, accessibility labels or logs (brief §11).

How that is enforced, in layers:

1. **Postgres.** `films`, `opening_secrets` and `playback_destinations`
   have owner-only RLS policies. A member's session simply cannot read
   them, whatever the app does.
2. **Security definer functions.** `reveal_opening()` and
   `reveal_sealed_recommendation()` verify the caller, record the reveal,
   and only then return the title. Safe projections
   (`get_sealed_recommendation_safe`, `get_my_library`,
   `get_house_openings`) return `null` for `title` unless that specific
   caller has revealed that specific film.
3. **Routes.** `/api/reveal/**` is POST-only so it can never be
   prefetched by a `<Link>`, and every signed-in page is
   `force-dynamic` — nothing secret enters a static build.
4. **Storage.** No Trailer files get UUID names; an upload whose original
   filename contains the title is rejected outright.
5. **Email.** Every send goes through `assertSafeEmailPayload()`, which
   scans the rendered subject, preheader, HTML and text against every
   title in the database before handing anything to Resend.
6. **Tests.** `npm run test:spoiler` plus
   `tests/e2e/spoiler-regression.spec.ts` fail if `Whiplash` appears in
   pre-reveal HTML, JSON, console output, the accessibility tree, the
   manifest, the service worker, or an email payload.

### No proxy/middleware file

Next 16 pins Proxy (formerly Middleware) to the Node.js runtime, which
the Cloudflare adapter cannot build. Authentication gating therefore
lives in `src/app/(app)/layout.tsx` and `src/app/desk/layout.tsx`, whose
`redirect()` throws before any child page renders — with RLS underneath
as the real boundary.

### The service worker caches almost nothing

`public/sw.js` is network-only for every navigation and every `/api/*`
request. It caches icons, fonts and the manifest and nothing else,
because a cached response is one more place a title could survive.

---

## Deployment

```bash
npm run cf:build
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL       # …and each of the other seven
npm run cf:deploy
```

The scheduled jobs run from a separate tiny worker in `workers/cron/`
(the OpenNext worker only exports a `fetch` handler, so a Cron Trigger
bound to it would have nothing to call):

```bash
cd workers/cron
npx wrangler secret put APP_URL
npx wrangler secret put CRON_SECRET     # must match the app's value
npx wrangler deploy
```

Full launch sequence and the daily programming workflow are in
[`OPERATIONS.md`](OPERATIONS.md).
