# HOUSE DARK

## Claude Code website build brief

Version 1.0  
August 2026  
Owner: Logan Ayers

This document is the source of truth for the House Dark Founding Beta. Build the product described here as a working, publishable, phone first web application. Do not reinterpret it as a streaming service, film database, review site, catalogue or generic social network.

The name is final. The product is House Dark.

### Instruction to paste into Claude Code

> Read `HOUSE_DARK_BUILD_BRIEF.md` in full before editing the repository. Treat it as the product source of truth. Inspect the current codebase, preserve only work that meets the brief, and create a concise `CLAUDE.md` from section 20. Then implement phases 1 to 6 in section 19. Build and test the real product, not a mock-up. Continue autonomously until an external account, credential, DNS change or legal approval is genuinely required. When blocked, ask for the smallest exact action needed.

---

## 1. The idea

**The best film experiences happen when you know nothing.**

Trailers show the plot. Reviews tell people how to feel. Thumbnails, rankings, autoplay previews and social media remove the surprise before the film has begun.

House Dark gives the film the first word.

Each night, House Dark presents one human chosen film through a short, original and spoiler safe No Trailer. It gives only the emotional temperature. The title is revealed only after the member chooses to enter.

House Dark also lets friends send films to one another under seal. The recipient sees a personal note and a few safe cues, but not the title. After watching, members leave six words. Only then does the conversation open.

### Product shorthand

**One film. A few friends. Nobody knows.**

### What House Dark is

1. A phone first private picture house.
2. One human chosen opening each night.
3. A way to receive a film from somebody whose taste you trust.
4. A private record of what you watched and how it felt.
5. A social ritual that begins after the film, not before it.

### What House Dark is not

1. A streaming platform.
2. A film catalogue.
3. A review database.
4. A ratings product.
5. A recommendation algorithm.
6. An infinite feed.
7. A poster wall.
8. A fake luxury club.

---

## 2. The transferable lesson from Founder Sports Club

Reference: https://www.artofmondays.com/founder-sports-club

Founder Sports Club does not primarily sell an interface. It sells a visible life people want to enter. Real members, recurring rituals, candid movement, identifiable people and member testimony provide the proof.

Apply that lesson to House Dark without copying the design.

### House Dark must show

1. Real friends arriving for a film.
2. A real sealed recommendation received on a phone.
3. Lights going down.
4. Real reactions after the credits.
5. The friend who programmed the night.
6. Six word responses from actual members.
7. A Circle that keeps returning.

### House Dark must not show

1. Generated members or crowds.
2. Invented club rooms or events.
3. Fake member quotes.
4. Generic cinema stock.
5. Velvet curtains, red carpets, popcorn, clapperboards, film reels or ticket props.
6. Luxury styling used as a substitute for a real experience.

Until real seed night photography is supplied, use the original No Trailer footage, product interface and restrained brand fields. Create clearly named content slots for real photography. Do not fill them with stock or generated people.

---

## 3. Release being built

Build a free, invitation friendly **Founding Beta** as a mobile first website and installable progressive web application.

There is no payment, subscription, paywall or trial clock in this release.

The application must work at 320 to 430 pixel phone widths and remain usable on tablet and desktop. The primary design and testing target is a modern phone browser.

The native application can come later. Do not wrap this beta in a thin WebView and call it a native app.

---

## 4. Primary user journeys

### Journey A: enter tonight's opening

1. Member signs in by email using a six digit one time code.
2. Member lands on Tonight.
3. The title is sealed.
4. Member sees only the opening number, running time, availability count, content notes and a restrained emotional invitation.
5. Member explicitly dims the house.
6. The original No Trailer plays.
7. The title is revealed.
8. Verified legal places to watch become available.
9. Member watches through the chosen external service.
10. Member returns and marks the film watched.
11. Member leaves six words.
12. The After Credits conversation opens.

### Journey B: receive a film under seal

1. A friend sends a film to one person or selected Circle members.
2. The recipient receives an email or in application notice with no title, poster, cast or identifying metadata.
3. Recipient opens a sealed recommendation.
4. Recipient sees the sender, a short personal note, running time and up to three safe cues.
5. Recipient chooses to reveal the title.
6. Verified legal playback destinations become available.
7. After watching, the recipient leaves six words.
8. The sender and eligible recipients can then see the conversation.

### Journey C: programme a Circle Opening

1. A Circle member chooses a film they already know.
2. They select recipients and add a short note.
3. They choose up to three safe cues.
4. The title remains sealed for every recipient.
5. The Circle can hold a shared watch time, with Thursday at 8pm as the initial recurring ritual.
6. Conversation remains sealed until each member records that they watched.

### Journey D: remember a film

1. Member opens Library.
2. Member sees their own openings, saved films and six word responses.
3. Member can filter between Yours, Circle and House programming.
4. Library is chronological and private by default.
5. There are no public star ratings, popularity rankings or poster grids.

---

## 5. Information architecture

### Public pages

1. Home
2. How it works
3. Join or sign in
4. Terms
5. Privacy
6. Film rights and service disclaimer

### Signed in navigation

Use four persistent destinations:

1. Tonight
2. Circle
3. Library
4. You

Do not add a fifth tab unless the feature cannot live naturally within these four.

### Owner only area

1. Programming Desk
2. No Trailer upload and preview
3. Provider links
4. Opening schedule
5. Review moderation
6. Member and Circle support
7. Email queue and delivery state
8. Audit log

---

## 6. Public website

The public website must feel like an invitation into a real film ritual. It should not look like a software landing page or a themed cinema website.

### Home page structure

Keep the page short.

#### Section 1: hero

Primary line:

> The best film experiences happen when you know nothing.

Supporting copy:

> Trailers show the plot. Reviews tell you how to feel. House Dark lets the film go first.

Primary action:

> Enter tonight

Secondary action:

> See how it works

Visual priority:

1. Use a real seed night film when supplied.
2. Until then, use the approved original No Trailer material or a restrained black opening field.
3. Do not use generated people or generic cinema photography.

#### Section 2: the ritual

Show three visual steps only:

1. Receive the feeling.
2. Choose to enter.
3. Speak after the credits.

#### Section 3: the Circle

Headline:

> Trust people, not percentages.

Explain sealed recommendations and shared openings using one real product capture and one short paragraph.

#### Section 4: six words

Show a small set of approved six word responses. These must be real or clearly marked beta demonstration content. Do not fabricate public member testimony.

#### Section 5: invitation

Headline:

> House Dark is open.

Action:

> Hold a seat

### Public site copy rules

1. Use short sentences.
2. Do not overexplain film culture.
3. Do not use startup language.
4. Do not use em dashes in visible copy.
5. Do not use phrases such as curated for you, discover your next favourite, unlock, content journey, cinematic universe or community platform.
6. Avoid decorative use of PRIVATE, MEMBERS ONLY and EXCLUSIVE. Access should feel desirable without pretending the beta is a status club.

---

## 7. Signed in product

### Tonight

Required states:

1. Opening not yet available.
2. Opening sealed and ready.
3. House dimming.
4. No Trailer playing.
5. Title revealed.
6. Saved for later.
7. Marked watched.
8. Six words requested.
9. After Credits open.

Required information before reveal:

1. Opening number.
2. Running time.
3. Number of verified playback destinations.
4. Minimum price language such as subscription, rental or free where accurate.
5. Content notes behind an intentional action.

Never show poster art, cast, year, director, genre, synopsis, ratings or title before reveal.

### No Trailer player

1. Use the supplied Whiplash test film as No Trailer 001.
2. The player begins only after an explicit user action.
3. Use a native video element with playsInline enabled.
4. No browser controls.
5. Show a restrained custom progress indicator.
6. Provide replay once the sequence completes.
7. Provide a clear retry if playback fails.
8. Never reveal the title as an error fallback.
9. Support reduced motion.
10. Autoplay must not depend on sound. Original room tone can play after user interaction when available.

### Reveal and watch handoff

1. Reveal the title and year only after the member enters.
2. Show verified legal providers after reveal.
3. Prefer a direct legal playback link where one is available.
4. If only a provider detail page exists, warn that the external service may show additional information.
5. House Dark does not host the feature film.
6. Do not embed a feature film player.
7. Do not use provider logos. Provider names in text are enough.
8. Provide Copy title and Stay in the house actions.

### Six words

1. Enforce six words on the server and client.
2. The member writes before seeing anybody else's response.
3. Responses from others remain blurred or hidden until eligible.
4. Allow edits for five minutes.
5. Allow deletion at any time.
6. Add an owner moderation action for spoilers or abuse.

### Circle

1. A member can create one or more private Circles.
2. A Circle has a name, invite code and private join link.
3. Members can leave a Circle.
4. An owner or moderator can remove a member.
5. A member can send an opening to one friend or selected Circle members.
6. The activity view can say that something was watched or sent but must not expose the title to an ineligible member.
7. Receiving is never restricted during the beta.
8. Add shared screening time and attendance response.
9. Use Thursday at 8pm as the initial default House Night, while allowing the organiser to change it.

### Library

1. Yours: films the member entered, saved or reviewed.
2. Circle: eligible activity from people in their Circles.
3. The House: previous programmed openings.
4. Search by title only after the member is eligible to know it.
5. Opening history must not expose titles the member never revealed.
6. No poster wall.
7. No star rating.
8. No popularity sorting.

### You

1. Display name.
2. Email.
3. Timezone and city.
4. Reminder preferences.
5. Marketing consent.
6. Circle memberships.
7. Export personal data.
8. Delete account and associated content.
9. Terms, Privacy and Film rights links.

---

## 8. Visual system

### Brand

Use the approved House Dark wordmark and intertwined HD ligature. Do not redraw the identity unless the supplied source asset is technically unusable.

### Colour

1. House Black: `#080807`
2. Projection Black: `#030303`
3. Stock Cream: `#E9E0D0`
4. Aged Paper: `#D8CCB8`
5. Oxblood: `#65131F`
6. Patina Brass: `#B9A16C`
7. Cool Green: `#36524C`

Brass is a minor registration colour, not a luxury effect. Do not use metallic gradients.

### Typography

1. Editorial: Newsreader
2. Utility: Barlow Condensed

Self host the font files and include their licences. Provide robust system fallbacks.

### Layout

1. Phone first.
2. Editorial spacing and asymmetry.
3. Strong vertical rhythm.
4. Fine rules.
5. One dominant idea per screen.
6. Touch targets at least 44 pixels.
7. Avoid excessive rounded cards.
8. Avoid pill shaped controls unless a real control requires one.
9. Use no glassmorphism.
10. Use no neon.
11. Use no decorative gradients.
12. Use no generic component library styling.

### Photography and motion

1. Real people only.
2. Candid rather than posed.
3. Practical light, flash, grain and natural imperfections are welcome.
4. Prioritise arrivals, hands, shared rooms and post film reactions.
5. Do not stage a fake physical House Dark venue.
6. Do not use stock cinema interiors.
7. Motion should feel like the room changing state, not a software demo.

### Animation

1. Button response: approximately 100 milliseconds.
2. Panel movement: approximately 220 milliseconds.
3. Dimming commitment: approximately 360 milliseconds.
4. Reveal: approximately 560 milliseconds.
5. Returning users should not wait through a long brand animation.
6. Respect prefers reduced motion.

---

## 9. Technical stack

Use a production capable, low cost stack:

1. Next.js using the latest stable App Router.
2. TypeScript with strict mode.
3. Custom CSS using CSS variables and CSS Modules. Do not use a visual component kit.
4. Supabase Postgres, Auth, Storage and Row Level Security.
5. Supabase email OTP with a six digit code.
6. Resend as custom SMTP and for operational email.
7. Cloudflare Workers or Pages for the free beta deployment, using the current supported Next.js adapter.
8. A web application manifest and service worker for installability.
9. Vitest for unit tests.
10. Playwright for critical user journeys.

Do not pin versions in this brief. At implementation time, choose compatible current stable versions and record them in the lockfile.

### Free beta assumptions

1. Supabase Free is sufficient for the initial database, authentication and short video storage.
2. Supabase's default SMTP is not sufficient for production. Configure Resend custom SMTP.
3. Resend Free is suitable for the initial beta volume but its daily and monthly limits must be monitored.
4. Cloudflare's free developer platform is suitable for the initial website traffic.
5. A custom domain is the likely first unavoidable external cost.

### Required environment variables

```text
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ADMIN_EMAILS=
CRON_SECRET=
```

Never expose the service role key to the browser.

---

## 10. Data model

Create SQL migrations, generated TypeScript types and seed data.

### Core tables

#### profiles

```text
id uuid primary key references auth.users
display_name text
avatar_path text nullable
city text nullable
timezone text not null
role enum member | moderator | owner
onboarding_complete boolean
marketing_consent_at timestamptz nullable
marketing_consent_source text nullable
created_at timestamptz
updated_at timestamptz
```

#### films

This table is owner and server only.

```text
id uuid primary key
title text
release_year integer nullable
runtime_minutes integer
country_code text nullable
rights_notes text nullable
created_at timestamptz
updated_at timestamptz
```

#### openings

Safe client visible opening information only.

```text
id uuid primary key
opening_number integer unique
opens_at timestamptz
closes_at timestamptz nullable
status enum draft | approved | scheduled | open | closed
runtime_minutes integer
availability_count integer default 0
minimum_access_type enum subscription | rental | free | mixed | unknown
no_trailer_storage_path text
no_trailer_poster_path text nullable
content_notes text nullable
created_at timestamptz
updated_at timestamptz
```

#### opening_secrets

Server and owner only.

```text
opening_id uuid primary key references openings
film_id uuid references films
approved_at timestamptz nullable
approved_by uuid nullable
```

#### opening_cues

```text
id uuid primary key
opening_id uuid references openings
cue text
sort_order integer
```

#### playback_destinations

Server protected until reveal.

```text
id uuid primary key
film_id uuid references films
territory text
provider_name text
access_type enum subscription | rental | purchase | free
deep_link text
verified_at timestamptz
is_active boolean
```

#### reveals

```text
user_id uuid references profiles
opening_id uuid references openings
revealed_at timestamptz
primary key user_id, opening_id
```

#### watches

```text
id uuid primary key
user_id uuid references profiles
opening_id uuid nullable references openings
sealed_recommendation_id uuid nullable
state enum saved | opened_service | watched
watched_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
```

#### six_word_reviews

```text
id uuid primary key
user_id uuid references profiles
opening_id uuid nullable references openings
sealed_recommendation_id uuid nullable
body text
word_count integer
visibility enum private | circle | house_approved
moderation_state enum visible | hidden | removed
created_at timestamptz
updated_at timestamptz
```

#### circles

```text
id uuid primary key
name text
created_by uuid references profiles
invite_code text unique
default_screening_day integer nullable
default_screening_time time nullable
created_at timestamptz
updated_at timestamptz
```

#### circle_members

```text
circle_id uuid references circles
user_id uuid references profiles
role enum member | organiser
joined_at timestamptz
primary key circle_id, user_id
```

#### sealed_recommendations

The film identity must not be returned to an ineligible recipient.

```text
id uuid primary key
sender_id uuid references profiles
secret_film_id uuid references films
personal_note text nullable
runtime_minutes integer
scheduled_for timestamptz nullable
created_at timestamptz
```

#### sealed_recommendation_recipients

```text
recommendation_id uuid references sealed_recommendations
recipient_id uuid references profiles
revealed_at timestamptz nullable
watched_at timestamptz nullable
primary key recommendation_id, recipient_id
```

#### sealed_recommendation_cues

```text
id uuid primary key
recommendation_id uuid references sealed_recommendations
cue text
sort_order integer
```

#### screenings

```text
id uuid primary key
circle_id uuid references circles
sealed_recommendation_id uuid nullable
opening_id uuid nullable
scheduled_for timestamptz
created_by uuid references profiles
created_at timestamptz
```

#### screening_attendance

```text
screening_id uuid references screenings
user_id uuid references profiles
response enum invited | attending | maybe | declined
updated_at timestamptz
primary key screening_id, user_id
```

#### email_preferences

```text
user_id uuid primary key references profiles
nightly_opening boolean
sealed_recommendations boolean
screening_reminders boolean
after_credits boolean
editorial_edm boolean
updated_at timestamptz
```

#### notification_queue

```text
id uuid primary key
user_id uuid references profiles
type text
send_at timestamptz
payload jsonb
status enum pending | sending | sent | failed | cancelled
attempts integer
last_error text nullable
created_at timestamptz
updated_at timestamptz
```

#### audit_log

```text
id uuid primary key
actor_id uuid nullable
action text
target_type text
target_id uuid nullable
safe_metadata jsonb
created_at timestamptz
```

Do not put film titles, provider URLs or other secret metadata in the audit log.

---

## 11. Spoiler security architecture

Spoiler protection is a security requirement, not a visual preference.

### Absolute rule

Before reveal, the film title and identifying metadata must not appear in:

1. Server rendered HTML.
2. Client JavaScript payloads.
3. Network responses.
4. GraphQL or REST records.
5. Storage paths.
6. Filenames.
7. Video metadata.
8. Poster metadata.
9. URLs or query strings.
10. Open Graph metadata.
11. Notifications.
12. Email subject lines or previews.
13. Analytics events.
14. Error messages.
15. Accessibility labels.
16. Browser history labels.
17. Logs.
18. Cached service worker responses.

### Required implementation pattern

1. Keep films and opening secrets behind owner and service role access.
2. The client fetches only a safe opening projection before reveal.
3. Create a server route or protected RPC to reveal.
4. The reveal endpoint verifies the authenticated member, records the reveal and returns title, year and verified destinations.
5. Only return secrets after the reveal transaction succeeds.
6. Do not prefetch the reveal route.
7. Do not include secret records in static generation or build output.
8. Use UUID storage paths and strip descriptive filenames.
9. Add automated tests that inspect HTML, JSON, logs and outgoing email payloads for forbidden title strings before reveal.

### Row Level Security

Create and test policies for every table.

Minimum rules:

1. Members can read and update only their profile.
2. Members can read Circles they belong to.
3. Members can see safe activity for their Circles.
4. Recipients can read the safe form of a sealed recommendation addressed to them.
5. Recipients cannot access `secret_film_id` before reveal.
6. Members can create and manage their own reviews.
7. Eligible Circle members can see a review only after they have watched or revealed according to the product rule.
8. Only moderators and owners can hide reviews.
9. Only owners can programme openings or access films and opening secrets.

Use safe database views or server functions rather than trusting the browser to hide protected columns.

---

## 12. Programming Desk and automation

The owner should be able to operate House Dark without editing code.

### Opening workflow

1. Create film.
2. Add runtime and internal rights notes.
3. Add up to three safe cues.
4. Add content notes.
5. Upload the original MP4.
6. Add verified playback destinations by territory.
7. Preview the sealed experience.
8. Preview the reveal experience.
9. Complete a human spoiler and rights approval.
10. Schedule the opening.
11. Monitor email queue and playback state.

### Human approval is mandatory for

1. Film programming.
2. No Trailer creative.
3. Spoiler safety.
4. Rights and source material.
5. Provider link accuracy.
6. Public use of member words or images.

### Automate

1. Opening state changes at the scheduled time.
2. Optional title free nightly email.
3. Sealed recommendation email.
4. Screening reminder.
5. After Credits prompt after a member marks watched.
6. Failed email retries with a cap.
7. Expired invite handling.
8. Basic media validation.
9. Safe daily operations report for the owner.

### Media checks

1. Accept MP4 and WebM.
2. Preferred vertical size is 1080 by 1920.
3. Preferred duration is 8 to 12 seconds.
4. Set a small beta file size limit suitable for Supabase Free storage.
5. Reject filenames containing the film title.
6. Use a UUID storage name.
7. Record duration, dimensions and MIME type.
8. Require human preview before approval.

### Future prompt pipeline

Do not make this a launch blocker.

Prepare an owner only slot for a future prompt assistant:

1. Owner enters a film title privately.
2. The assistant returns three spoiler safe visual treatments.
3. Treatments contain no character names, actor likeness, recognisable locations, famous dialogue, plot turns, climax or ending.
4. A person selects and edits the final treatment.
5. Logan creates the video externally and uploads it.
6. A person approves the final No Trailer.

Do not call a paid model in the Founding Beta unless an API key is deliberately configured.

---

## 13. Email and EDM

### Authentication

1. Use a six digit email OTP.
2. No password.
3. OTP request cooldown and expiry must be visible in plain language.
4. Configure Resend as Supabase custom SMTP.
5. Do not rely on Supabase's demonstration SMTP for a public beta.

### Operational emails

1. Tonight's opening is ready.
2. A friend sent you a film under seal.
3. Your Circle screening is approaching.
4. The conversation is open after you record your six words.

No operational email may carry the title before reveal.

### Marketing consent

1. Keep authentication acceptance separate from marketing consent.
2. Use an unchecked marketing consent box.
3. Store the consent time and source.
4. Allow withdrawal from You.
5. Include an unsubscribe action in every editorial email.

### Editorial email style

The email should feel like a short note from the house, not a newsletter template.

Keep it to:

1. One thought.
2. One visual.
3. One action.

No title before reveal. No ratings. No entertainment news roundup.

---

## 14. Legal and privacy requirements

Use plain language, but mark the final legal copy for Australian legal review before a broad public launch.

### Required statement

House Dark does not own, license, host, stream, sell or distribute the feature films it introduces. Rights in each film remain with the relevant rights holders. House Dark provides an original spoiler safe introduction and, after reveal, may link to verified legal services where the film can be watched.

### Additional requirements

1. Do not use film posters, studio stills, copyrighted trailers, protected music, studio logos or actor likeness in House Dark No Trailers.
2. Every No Trailer must use original or properly licensed material.
3. Provider names appear only to identify availability. Do not imply partnership or endorsement.
4. Member words remain theirs. The Terms should grant House Dark limited permission to display them according to the chosen visibility.
5. Members must be able to delete their reviews and account.
6. Store only the data required for the service.
7. Do not upload a member's contacts.
8. Do not sell personal data.
9. Provide a data export route.
10. Record administrative access in a safe audit log.

---

## 15. Analytics

Use privacy restrained first party events or a privacy suitable provider.

Track only what is required to improve the beta:

1. Sign in completed.
2. Opening viewed.
3. Dimming started.
4. No Trailer completed.
5. Reveal completed.
6. Provider handoff selected.
7. Saved for later.
8. Marked watched.
9. Six words submitted.
10. Recommendation sent.
11. Circle invitation accepted.
12. Screening attendance response.

Never send a film title, provider URL, personal note, review body or secret film identifier to analytics.

Use an opaque opening number or safe event ID only where necessary.

---

## 16. Accessibility, performance and resilience

### Accessibility

1. Meet WCAG 2.2 AA for core flows.
2. Full keyboard access.
3. Visible focus states.
4. Semantic headings and landmarks.
5. Colour contrast tests.
6. Captions for spoken No Trailer audio.
7. Reduced motion mode.
8. Error messages associated with the correct input.
9. No title leakage through accessibility text.

### Performance

1. Target a Lighthouse mobile score above 90 for Performance, Accessibility, Best Practices and SEO on the public site.
2. Optimise and defer media.
3. Do not preload secret data.
4. Keep the signed in application responsive on ordinary mobile connections.
5. Avoid unnecessary animation and JavaScript dependencies.

### Resilience

1. Provide loading, empty and error states for every screen.
2. A broken video must never reveal a title as a fallback.
3. Prevent duplicate recommendations and reviews on retry.
4. Email jobs must be idempotent.
5. Scheduled opening state changes must be safe to run more than once.

---

## 17. Testing requirements

### Unit tests

1. Six word counting.
2. Safe cue validation.
3. Email payload sanitisation.
4. Title leak detector.
5. Opening state transitions.
6. Eligibility for After Credits.
7. Marketing consent storage.

### Database and RLS tests

1. Anonymous user cannot read protected records.
2. Member cannot read films or opening secrets.
3. Recipient cannot read a sealed title before reveal.
4. Non member cannot read Circle activity.
5. Member cannot edit another member's review.
6. Moderator can hide but not silently rewrite a review.
7. Owner can programme an opening.

### Playwright journeys

1. New email OTP sign in.
2. Onboarding to Tonight.
3. Dim, play No Trailer, reveal and open provider handoff.
4. Mark watched and submit six words.
5. Create a Circle and accept an invitation.
6. Send and receive a film under seal.
7. Navigate Tonight, Circle, Library and You in both directions.
8. Create and schedule an opening in the Programming Desk.
9. Delete review and account.
10. Installable PWA check.

### Spoiler regression test

Use the seeded title `Whiplash` as the forbidden string before reveal.

The automated test must fail if that string appears in pre reveal HTML, JSON, storage filenames, accessible labels, email payloads, console output or logs.

---

## 18. Seed content

Use the supplied original file:

`The Drummer's Solitary, Silent Prelude.mp4`

Seed it as No Trailer 001.

Internal film mapping:

1. Title: Whiplash
2. Release year: 2014
3. Runtime: 106 minutes
4. Safe cues: Drummer, School, Ambition

The title and mapping must remain protected before reveal.

Seed clearly labelled demonstration members and Circles for local development only. Production must not present demo people or quotes as real members.

---

## 19. Build sequence for Claude Code

### Phase 1: inspect and stabilise

1. Inspect the repository before editing.
2. Read existing brand assets, video assets and product source.
3. Preserve working material that complies with this brief.
4. Remove or replace broken navigation, dead buttons and fake interactions.
5. Create a short implementation plan in the repository.

### Phase 2: foundation

1. Set up the Next.js application.
2. Add design tokens, fonts and brand assets.
3. Add Supabase clients and environment validation.
4. Create migrations, RLS and generated types.
5. Build public pages and email OTP authentication.

### Phase 3: core opening

1. Tonight states.
2. Dimming gesture.
3. No Trailer player.
4. Secure reveal endpoint.
5. Playback handoff.
6. Save and watch states.
7. Six words and After Credits.

### Phase 4: Circle and Library

1. Circle creation and invite.
2. Send under seal.
3. Recipient reveal.
4. Shared screening.
5. Circle activity.
6. Library and eligible search.

### Phase 5: Programming Desk and automation

1. Opening CRUD.
2. Media upload.
3. Safe preview.
4. Approval and schedule.
5. Provider management.
6. Email queue and scheduled jobs.
7. Moderation.

### Phase 6: launch readiness

1. PWA manifest and icons.
2. Accessibility pass.
3. Mobile QA.
4. Security and title leak tests.
5. Performance pass.
6. Legal pages.
7. Production deployment.
8. Smoke test the production URL.

---

## 20. Claude Code working rules

1. Build the application. Do not stop at a visual prototype.
2. Do not leave dead buttons or placeholder navigation.
3. Do not claim a feature works without testing it.
4. Do not substitute fake data for a backend feature and call it complete.
5. Do not generate people, reviews or social proof.
6. Do not introduce a payment system.
7. Do not reopen the name or brand direction.
8. Do not add film posters or third party film imagery.
9. Do not expose protected title data to the client before reveal.
10. Keep dependencies minimal and justified.
11. Use migrations for database changes.
12. Keep TypeScript strict and resolve errors.
13. Run formatting, lint, type check and tests before handoff.
14. Check every route and all back navigation on a phone viewport.
15. Commit complete logical units with clear messages when Git is available.
16. Continue autonomously until an external account, key, DNS change or legal decision is genuinely required.
17. When blocked, provide the exact smallest action Logan must take. Do not return a generic setup list.

---

## 21. Required deliverables

1. Working source repository.
2. Production deployment.
3. Mobile review URL.
4. Supabase SQL migrations.
5. RLS policy tests.
6. Seed script containing the protected Whiplash example.
7. Programming Desk.
8. Resend email templates and setup.
9. `.env.example` with no secrets.
10. `README.md` with local setup and deployment.
11. `OPERATIONS.md` explaining the daily opening workflow.
12. `LAUNCH_CHECKLIST.md` containing only unresolved external actions.
13. Passing lint, type check, unit tests and Playwright critical flows.
14. A final list of any necessary manual inputs.

---

## 22. Definition of done

The Founding Beta is complete when:

1. A new member can sign in by email OTP.
2. The member can enter the Whiplash test opening without the title appearing anywhere before reveal.
3. The No Trailer plays reliably on a phone.
4. The reveal is secure and records eligibility.
5. A legal provider handoff works after reveal.
6. A member can save, mark watched and leave six words.
7. After Credits remains sealed until the member is eligible.
8. A member can create a Circle and invite a friend.
9. A film can be sent and received under seal.
10. Circle activity and Library work without title leakage.
11. Logan can programme and schedule the next opening without editing code.
12. Operational emails contain no spoilers.
13. The public site is polished, fast and clearly communicates the idea.
14. All primary mobile click paths and back actions work.
15. No generated people, fake social proof, dead features or film rights violations remain.

---

## 23. External actions that Claude Code cannot complete alone

Ask Logan only when these become necessary:

1. Create or provide access to the Supabase project.
2. Create or provide the Resend API key and verify the sending domain.
3. Create or provide access to the Cloudflare account.
4. Purchase or connect the final domain.
5. Supply the approved House Dark logo source if it is not in the repository.
6. Supply the real seed night photography and footage when available.
7. Approve final Terms, Privacy and rights language after legal review.

Everything else should be completed autonomously.

---

## 24. Official implementation references

Use current official documentation at implementation time:

1. Supabase plans and Free tier: https://supabase.com/pricing
2. Supabase email authentication: https://supabase.com/docs/guides/auth/auth-email-passwordless
3. Supabase Auth rate limits: https://supabase.com/docs/guides/auth/rate-limits
4. Supabase custom SMTP: https://supabase.com/docs/guides/auth/auth-smtp
5. Resend plans: https://resend.com/pricing
6. Resend account limits: https://resend.com/docs/knowledge-base/account-quotas-and-limits
7. Cloudflare developer platform plans: https://www.cloudflare.com/plans/developer-platform/
8. Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/

Do not infer production capacity from the word free. Confirm current quotas before launch and add monitoring for authentication email volume, storage, database size and edge requests.
