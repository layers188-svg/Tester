# Reviewing the motion

The signature sequences need no Supabase project, no accounts and no
configuration. `/dev/stage` mounts the real components with fixture
props and stubs the network, so everything below runs from a clean
checkout in about two minutes.

For a link you can open on a phone instead, skip to
[Putting it online, free](#putting-it-online-free) — it costs nothing
and needs one setting changed.

---

## Locally, in two minutes

```bash
git clone https://github.com/layers188-svg/Tester.git house-dark
cd house-dark
git checkout claude/new-session-qvb1ur
npm ci
npm run dev
```

Then open **http://localhost:3000/dev/stage**.

There is no `.env` step. The stage does not touch the database, so it
starts without one — verified from a checkout with no env file at all,
with all fifteen rendered-motion tests passing against it.

The bar across the top switches states. Use a phone-width window
(390px is what everything was measured at) or your browser's device
toolbar.

### What to look at, and what it should do

| State                  | The sequence                                         | What to watch for                                                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sealed**             | Tonight, sealed → clue → No Trailer → black → reveal | Press _and hold_ the sealed card. A brass rule draws under your finger; let go early and it returns to sealed. Hold it through and the frame grows as the room behind it recedes.                      |
|                        |                                                      | Press Continue, then Play. The picture runs its ten seconds, goes to black, and the title arrives **after** the black — not with it.                                                                   |
| **Room door**          | Home → The Room                                      | The preview carries your six words and one Circle voice. Press it: that panel is promoted into a layer, travels to the Room's header, and the quote you were reading is still on screen when you land. |
| **The Room**           | The scroll field                                     | Switch to _Your Circle_ and scroll slowly. Voices approach, sharpen and grow, then pass and soften. Nothing is a card.                                                                                 |
| **Trust Us**           | Territory → one film → Seen it / Trust us            | Pick a mood. Press **Seen it** and watch the film leave sideways with the next arriving behind it — you never pass through a list. Press **Trust us** and the information closes down.                 |
| **Under Seal**         | Circle, incoming                                     | Press _Enter under seal_. The seal parts and the title resolves inside the same object — no loading state in between.                                                                                  |
| **Library**            | A record unfolding                                   | Open a record: it grows in place and its neighbours make room. A revealed film plays its No Trailer again.                                                                                             |
| **Revealed / Watched** | Post-reveal and the six words                        | _Six words after the picture_, with **Skip for now** as an equal action.                                                                                                                               |

The entry aperture is on **http://localhost:3000/** rather than the
stage. It plays once per browser session — open a new tab, or a private
window, to see it again from the start.

### Reduced motion

Turn on your OS "reduce motion" setting and reload. Every state change
should survive; only the travel between them goes. The black hold
before a title is deliberately kept — it is a beat, not an animation.

### If you would rather read the numbers than watch

```bash
npx playwright test tests/e2e/motion.spec.ts
```

Fifteen tests that measure geometry rather than asserting a class name
is present — frame sizes through the ritual, the millisecond gap
between the picture ending and the title arriving, how far a Room voice
travels, the seal's compression percentage.

---

## Putting it online, free

The motion needs no server. `/dev/stage` mounts the real components and
answers their network calls itself, and the entry aperture is client
side, so both export to flat files — and flat files on a public
repository are free forever on GitHub Pages. That is what
`stage-site/` builds, and it is already wired up.

**One switch, once, and only you can throw it:**

> **Settings → Pages → Build and deployment → Source → GitHub Actions**
>
> <https://github.com/layers188-svg/Tester/settings/pages>

Nothing else. No account, no card, no token, no DNS. The workflow
(`.github/workflows/motion-review-site.yml`) is already on the branch and
runs on every push to it; the moment the source is set it will build and
publish. If it has already run and failed for want of that setting, use
**Actions → Motion review site → Run workflow** to run it again.

The link will be:

```
https://layers188-svg.github.io/Tester/
```

It opens on the projection aperture, exactly as the product does. Come
through it and the page you land on has a button through to the
simulator, at `/Tester/dev/stage/`. Deep links work too —
`…/dev/stage/?state=room` and so on for each of the eight.

All fifteen rendered-motion tests pass against that export, run against
the same bytes that get published — see `stage-site/README.md` for how
that is checked, and for the two places the review site deliberately
differs from the product.

What will not work there is the House itself: signing in, tonight's
opening, your Circle. Those need a database, which is the next section.

### Why not Cloudflare

The whole application, server rendered, is what needs paying for.
Measured with `npx wrangler deploy --dry-run`:

|                                                  |                                 |
| ------------------------------------------------ | ------------------------------- |
| Worker upload                                    | 10,779 KiB                      |
| **Compressed — the number the limit applies to** | **2,038 KiB (≈2.0 MiB)**        |
| Free plan limit                                  | 1 MiB — too small               |
| Workers Paid limit                               | 10 MiB — fits, with 8 MiB spare |

A Next.js app rendered on the server is a couple of megabytes of Worker
however it is built; there is no trimming that gets it under 1 MiB. An
account-less `wrangler deploy --temporary` uses a free preview account
and fails with `code: 10027` for exactly this reason.

That deploy attempt found a real problem, now fixed: Cloudflare refuses
any static asset over 5 MB, and the seed No Trailer master (9.9 MB) had
briefly been placed in `public/`. It lives in `assets/no-trailers/` now,
unserved, which is where the architecture always said it belonged.

If you do end up on the Workers Paid plan, `/dev/stage` can ride along on
a preview deploy — it is a 404 in production unless explicitly switched
on, verified against a real production build:

```bash
npx wrangler secret put HOUSE_DARK_ENABLE_STAGE   # value: true
npm run cf:deploy
```

> Leave `HOUSE_DARK_ENABLE_STAGE` unset — or set it to anything other
> than `true` — on the real production deployment. The route checks it
> on the server at render time, so it cannot be switched on from a
> browser.

### The whole product — Cloudflare and Supabase

The House itself needs a database for authentication, openings, reveals
and everything a member does. That is item 1 in `LAUNCH_CHECKLIST.md`.

```bash
supabase link --project-ref <ref>
npm run db:migrate     # includes the House Dark 500
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

Then set these as Worker secrets and deploy:

```
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
ADMIN_EMAILS
CRON_SECRET
```

`wrangler.jsonc` lists the same set and deliberately holds none of their
values.
