# Preview deploy — running House Dark without buying a domain

The point of this document: get the real application onto a real HTTPS
URL you can open on your phone, sign into, and use, **without buying
`housedark.club` or any other domain**. Test it first, invest after.

This is not a demo mode or a mock. It is the same Workers bundle, the
same Supabase project, the same code that goes live later. The only
difference is the address.

> **Already done — this is now a record, not a plan.**
> The app is deployed at **https://house-dark.layers188.workers.dev**,
> with all eight secrets set, and `house-dark-cron` running the `*/5`
> schedule against it. Steps 1–3 and 6 below are complete. Step 4
> (the Supabase `{{ .Token }}` email template) still gates sign-in,
> and step 5 (Resend) still gates every email the product itself
> sends — `RESEND_API_KEY` is deployed as the placeholder `not-yet`.
> Keep the rest as the reference for redeploying or moving to a real
> domain.

---

## What replaces the domain

Cloudflare gives every account one free subdomain, and every Worker on
it a free HTTPS hostname:

```
https://house-dark.<your-subdomain>.workers.dev
```

`house-dark` is fixed — it is the `name` in `wrangler.jsonc`.
`<your-subdomain>` is yours to pick once, in the Cloudflare dashboard.

That hostname is real HTTPS with a valid certificate, which matters more
than it sounds: **the PWA install prompt, the service worker, and
Supabase auth cookies all require a secure origin**, and `workers.dev`
is one. Nothing about the product degrades on it.

---

## Why nothing in the code has to change

This was checked rather than assumed:

- `public/manifest.webmanifest` uses only relative paths (`/tonight`,
  `/icons/…`), so the installed app follows whatever origin serves it.
- `metadataBase` in `src/app/layout.tsx` derives from
  `NEXT_PUBLIC_APP_URL`.
- Every link in every email is built from `NEXT_PUBLIC_APP_URL` too.
  (This used to fall back to `https://housedark.app` — a domain this
  project does not own — which would have quietly pointed members at a
  stranger's website. There is no fallback now: a missing value stops
  the app instead.)
- Sign-in is a **six-digit code**, not a magic link:
  `signInWithOtp` is called with no `emailRedirectTo`, and `verifyOtp`
  exchanges the code in the browser. So there is no redirect allowlist
  to maintain and no callback URL to get wrong — and changing the domain
  later cannot break authentication.

One origin value, set in one place, and the app is wherever you put it.

---

## Steps

### 1. Cloudflare account and subdomain — 5 minutes

Create a free account at <https://dash.cloudflare.com/sign-up>. No card,
no domain, no plan choice yet.

In **Workers & Pages → Overview**, set your `workers.dev` subdomain when
prompted. Do this _before_ building — the next step needs the finished
URL. Write down the result:

```
https://house-dark.<your-subdomain>.workers.dev
```

### 2. Point the app at that URL

In `.env.local`:

```
NEXT_PUBLIC_APP_URL=https://house-dark.<your-subdomain>.workers.dev
```

`NEXT_PUBLIC_*` values are inlined into the client bundle at build time,
which is why the URL has to be known before the build, not after the
deploy.

### 3. Build and deploy

```bash
npx wrangler login
npm run cf:build
npx wrangler secret put NEXT_PUBLIC_APP_URL     # …and each of the other seven
npm run cf:deploy
```

The eight secrets are the eight variables in `.env.example`. The build
already succeeds and the bundle already runs — `npm run cf:preview`
serves it in workerd and all Playwright journeys pass against it — so
this step is a deploy, not an experiment.

### 4. Tell Supabase the origin

**Authentication → URL Configuration → Site URL**: the same
`workers.dev` URL.

Strictly, the code-based sign-in above does not consult it. Set it
anyway: it is what Supabase substitutes into email templates, and
leaving it as `http://localhost:3000` is the kind of thing that is
invisible until it is embarrassing.

While you are there — **Authentication → Email Templates → Magic Link**
must contain `{{ .Token }}`, or Supabase sends a link and the app asks
for a code that never arrives. `OPERATIONS.md` has the exact template
text.

### 5. Email, for an audience of one

This is the one place the missing domain is actually felt, and the
answer depends on who is receiving.

House Dark sends over two separate channels, and they fail differently:

- **Sign-in codes** come from Supabase Auth, over whatever SMTP the
  project is configured with.
- **Everything the product itself sends** — nightly opening, sealed
  recommendation, screening reminder, After Credits, editorial — goes
  through Resend from `src/lib/email/send.ts`, using
  `RESEND_FROM_EMAIL`.

**For an audience of one, neither needs a domain:**

- Leave Supabase on its built-in email service (no custom SMTP). It is
  rate-limited to a handful of messages an hour — useless for a beta,
  entirely adequate for signing yourself in.
- Set `RESEND_FROM_EMAIL=onboarding@resend.dev`, Resend's shared test
  sender. It requires no verification and delivers **only to the address
  that owns the Resend account** — so point `ADMIN_EMAILS` and your test
  member at that same address and the full nightly path works end to
  end.

**The moment you invite a second person, you need a verified sending
domain.** Resend will not send to arbitrary recipients from a domain it
cannot verify, and no configuration gets around that — it is how the
anti-spam model works, not a Resend restriction. That is the real
trigger for buying the domain: not deploying, not testing, _inviting_.

So the order that costs least is: deploy free → test alone →
buy the domain the week you invite friends.

### 6. The nightly schedule

```bash
cd workers/cron
npx wrangler secret put APP_URL        # the workers.dev URL
npx wrangler secret put CRON_SECRET    # must match the app's value
npx wrangler deploy
```

Cron Triggers are on the free plan (5 per account; this uses one).

### 7. Install it on your phone

Open the `workers.dev` URL in Safari or Chrome on your phone and add to
home screen. The manifest, icons and standalone display all work from
this origin — that is what step 4's relative-path check was for.

---

## Costs, stated honestly

Buying a domain is genuinely avoidable for now. One thing might not be:

|                     | Workers Free | Workers Paid |
| ------------------- | ------------ | ------------ |
| Cost                | £0           | ~$5/month    |
| Requests            | 100,000/day  | no daily cap |
| **CPU per request** | **10 ms**    | 30 s         |
| Cron Triggers       | 5            | 250          |

Requests and cron are not close to binding for one person. The 10 ms CPU
limit might be. Server-rendering a React page can exceed 10 ms of actual
CPU, and House Dark deliberately renders every signed-in route
dynamically — caching a page is how a title leaks, so that is not
something to trade away for a plan tier.

I cannot predict from here whether it fits; it depends on the request.
The honest position is: **start on Free, and if pages return "Worker
exceeded CPU time limit", the fix is $5/month, not a domain.** Waiting
for the request budget does not count against it — only computation
does, so time spent waiting on Supabase is free.

Either way the decision you asked to defer — the domain — stays
deferred.

---

## Switching to the real domain later

When the domain is bought, this is the whole change:

1. `NEXT_PUBLIC_APP_URL` → the real origin (rebuild and redeploy).
2. Supabase **Site URL** → the real origin.
3. The cron worker's `APP_URL` secret → the real origin.
4. Add the custom domain to the Worker in the Cloudflare dashboard.

No code edit, no migration, no data change. Members signed in on
`workers.dev` will need to sign in again on the new origin, because
cookies are per-origin — with a beta of one, that is you, once.
