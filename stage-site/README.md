# stage-site — the motion review site

A static export of the public entry and `/dev/stage`, published to GitHub
Pages so the signature motion can be reviewed on a phone from a link,
free, with no database and no paid hosting.

## Why it is a second app

`output: "export"` is all or nothing. Pointed at the product it would
also try to export `/api/*` and every `force-dynamic` signed-in route,
which cannot be static and must not be — the reveal route is the only
path from sealed to revealed, and it is a server route on purpose.

So this app exports only the routes that genuinely have no server behind
them:

| Route                                                 | What it is                                                   |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `/`                                                   | The real marketing home, behind the real projection aperture |
| `/how-it-works`, `/terms`, `/privacy`, `/film-rights` | The real pages, re-exported                                  |
| `/join`                                               | **Not** the real page — see below                            |
| `/dev/stage`                                          | The staging state simulator                                  |

Nothing is copied. Every page here is a one-line re-export of the
component the product uses, so what is reviewed is what ships. The two
exceptions are deliberate:

- **`/join`** replaces the product's sign-in, which needs Supabase and
  Resend. A form that takes an email address and then silently fails is
  a worse thing to publish than a page that says what this site is. The
  path is kept because the aperture's exit points at it, and that link
  is part of what is under review.
- **The layout** drops the service worker. This is a review surface; a
  cache that outlives a redeploy is the last thing it needs.

The home page reads approved six words from Supabase and falls back to
its own clearly-marked demonstration set when there is no project to
read from. There is none here, so the export is built from the fallback.

## Building and checking it

```bash
BASE_PATH=/Tester npm run stage:build   # → stage-site/out
npm run stage:serve                      # → http://localhost:4173
PLAYWRIGHT_BASE_URL=http://localhost:4173 npx playwright test tests/e2e/motion.spec.ts
```

`BASE_PATH` is the subdirectory a GitHub Pages project site is served
from; leave it unset to build a site rooted at `/`. It also reaches
`noTrailerUrl()` as `NEXT_PUBLIC_BASE_PATH`, because Next prefixes its
own asset URLs but not a path carried inside a Library record.

`npm run stage:serve` answers on both `/` and the base path from the same
files, which is what lets the motion suite run against exactly the bytes
that are published rather than a second build made to suit the test.

All fifteen rendered-motion tests pass against the export. That
equivalence is the point: a review link showing something the motion
suite has not measured would be a demo, not evidence.

## Deploying

`.github/workflows/motion-review-site.yml`, on every push to the
development branch. It needs Settings → Pages → Build and deployment →
Source → **GitHub Actions**, set once by hand.
