# Reviewing the motion

The signature sequences need no Supabase project, no accounts and no
configuration. `/dev/stage` mounts the real components with fixture
props and stubs the network, so everything below runs from a clean
checkout in about two minutes.

If you want the whole product live rather than the motion, skip to
[Putting it online](#putting-it-online).

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

## Putting it online

Two separate things are needed, and only the first is required for a
link that shows the motion.

### A link that shows the motion — Cloudflare only

`/dev/stage` is a 404 in production unless it is explicitly switched on,
so a preview deploy can carry it without exposing it by accident.

**What I need from you:** a Cloudflare account and an API token with
Workers permissions (`CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_ACCOUNT_ID`).

Then:

```bash
npx wrangler secret put HOUSE_DARK_ENABLE_STAGE   # value: true
npm run cf:deploy
```

That gives a URL where the stage is reachable. The signed-in product on
it will not work, because it has no database.

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
