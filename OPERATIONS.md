# House Dark — operations

How Logan runs House Dark day to day, without editing code. Everything
here happens in the Programming Desk at `/desk`, which is visible only to
accounts whose email is listed in `ADMIN_EMAILS`.

---

## One-time setup

### 1. Supabase

1. Create the project at [supabase.com](https://supabase.com). Free tier
   is sufficient for the beta's database, auth and short video storage.
2. From **Project settings → API**, copy the project URL, the `anon` key
   and the `service_role` key into the deployment's environment.
3. Apply the schema: `supabase link --project-ref <ref>` then
   `npm run db:migrate`.
4. Under **Authentication → Providers → Email**, confirm email sign-in is
   on and passwords are off. Set the OTP length to 6 and expiry to 300
   seconds.
5. **Change the email template, or nobody can sign in.** `/join` uses
   `signInWithOtp` and `verifyOtp` — a six digit code typed into the
   second step, never a link. Supabase's stock "Magic Link" template
   sends `{{ .ConfirmationURL }}`, so out of the box a member receives a
   link and the code screen has nothing to accept. Under
   **Authentication → Email Templates → Magic Link**, put `{{ .Token }}`
   in the body. Something like:

   ```
   Your House Dark code is {{ .Token }}. It expires in five minutes.
   ```

   Keep the subject and body free of anything about tonight's film —
   brief §11 covers email subject and preview text too.

### 2. Resend as Supabase custom SMTP

Supabase's built-in SMTP is rate-limited and shared — it is not suitable
for a public beta, and auth emails will silently drop under it.

1. Create the Resend account, verify the sending domain, and create an
   API key.
2. In Supabase: **Project settings → Authentication → SMTP Settings**,
   enable custom SMTP with host `smtp.resend.com`, port `465`, username
   `resend`, and the Resend API key as the password. Sender address must
   be on the verified domain.
3. Put the same API key in `RESEND_API_KEY` and the sender in
   `RESEND_FROM_EMAIL` — the app's own operational email uses them
   directly.
4. Send yourself a test code from `/join` and confirm it arrives.

### 3. Owner access

Add your email to `ADMIN_EMAILS` (comma separated, lowercase) **before**
signing in for the first time. The role is granted by
`/api/auth/ensure-profile` on first sign-in. If you already signed in
first, set `role = 'owner'` on your `profiles` row once in the Supabase
SQL editor.

### 4. Scheduled jobs

Deploy `workers/cron/` with `APP_URL` and a `CRON_SECRET` matching the
app's. It fires every five minutes and calls `POST /api/cron`, which:

- opens `scheduled` openings whose `opens_at` has passed,
- closes `open` openings past their `closes_at`,
- queues the nightly opening email for members who opted in,
- queues screening reminders for anything starting within two hours,
- drains the email queue with capped retries (5 attempts, backing off
  1/5/15/60/240 minutes).

Every step is idempotent — running it twice, or two runs overlapping,
changes nothing extra.

Check it is alive: `/desk/emails` should show rows moving to `sent`.

---

## Programming tonight's opening

The whole workflow is in the Desk. Nothing below requires code.

### 1. Create the opening

`/desk/openings/new`. You enter:

- **Film title** — internal only. This never reaches a member's browser
  before they reveal it.
- **Release year** and **runtime**.
- **Access type** — subscription, rental, free, mixed, or unknown.
- **Rights notes** — internal. Where the film came from, what you have
  checked.
- **Content notes** — member-facing, behind a deliberate tap.
- **Up to three safe cues** — single words with no plot, no character
  names, no ending. (`Drummer`, `School`, `Ambition`.)

This creates a **draft**. Drafts are invisible to members.

### 2. Upload the No Trailer

On the opening's page. Requirements:

- MP4 or WebM, under 25MB.
- Preferred: vertical 1080×1920, 8–12 seconds.
- **The filename must not contain the film's title** — the upload is
  rejected if it does.
- The file is stored under a UUID name. The original filename is
  discarded.
- Original or properly licensed material only. No posters, studio stills,
  copyrighted trailers, protected music, studio logos or actor likeness.

The Desk records duration, dimensions and MIME type in the audit log and
warns if the duration is outside 8–12 seconds.

### 3. Add verified providers

Add each legal place the film can be watched, per territory. Prefer a
direct playback link; if only a provider detail page exists, say so in
the copy — the external service may show more than House Dark does.

Mark each one **verified** only after you have personally opened the link
and confirmed it plays the right film in the right territory. Provider
link accuracy is a mandatory human approval item.

Use provider **names** only. Never provider logos — that would imply a
partnership that does not exist.

### 4. Preview both experiences

The opening's page has a **sealed preview** and a **reveal preview**.
Check the sealed one the way a member would see it: opening number,
runtime, availability count, access language, cues, content notes. If
anything in that view hints at the title, fix it before going further.

### 5. Approve

Approval is a human step and is mandatory. By approving you are
confirming:

1. The film is what you intend to programme.
2. The No Trailer creative is yours or properly licensed.
3. It is spoiler safe.
4. Rights and source material are in order.
5. Provider links are accurate.

Approval is blocked until a No Trailer is uploaded.

### 6. Schedule

Set `opens_at` and move the opening to **scheduled**. The cron worker
flips it to **open** at that moment and queues the nightly email. You do
not need to be awake for it.

Openings move forward only: draft → approved → scheduled → open → closed.
Re-applying the current status is a safe no-op.

---

## Moderation

`/desk/moderation` lists six-word reviews, newest first.

- **Hide** — removes it from other members' After Credits, reversible.
- **Remove** — for abuse or a genuine spoiler.
- **Approve for public site** — promotes it to the small set of six words
  shown on the home page. Only do this with the member's knowledge;
  public use of member words is a mandatory human approval item.

You can change a review's state but never its text. That is enforced in
the database, not just the UI — a moderator's update to `body` is
silently reverted by a trigger.

Members can always delete their own review, and can edit it within five
minutes of posting.

---

## Watching the beta

- `/desk/emails` — delivery state per notification. Anything stuck in
  `failed` has exhausted its five attempts; the `last_error` column says
  why. No message content or title is stored here.
- `/desk/audit` — administrative actions. Deliberately carries no film
  titles, provider URLs or member content.

### Quotas to keep an eye on

The word "free" is not a capacity plan. Before launch and periodically
after, check current limits directly:

- Supabase database size, storage, and **auth email rate limits** —
  the auth rate limit is the one most likely to bite during an invite
  wave.
- Resend daily and monthly send limits.
- Cloudflare Workers request counts.

---

## If something goes wrong

**Members report no sign-in code.** Check Resend's dashboard for
delivery failures first, then Supabase's auth logs. If Supabase is
falling back to its own SMTP, custom SMTP is misconfigured — that alone
will throttle you to a handful of emails per hour.

**An opening did not open on time.** Check that the cron worker is
deployed and its `CRON_SECRET` matches the app's. Hitting
`POST /api/cron` manually with the bearer token does the same work
immediately and is safe to repeat.

**A title leaked.** Treat it as a security incident, not a bug. Take the
opening back to `closed`, run `npm run test:spoiler`, and find which of
the layers in the README's "Spoiler security" section was bypassed
before programming anything else.

**A rights holder makes contact.** Deactivate the affected provider links
and close the opening from the Desk immediately, then respond. The
service disclaimer is at `/film-rights`.
