# House Dark final build brief

## 1. The idea

**Find the joy in not knowing.**

House Dark is a private picture house built around entering films with as little preconception as possible. It does not pretend to shield the member from the whole internet. It controls what House Dark reveals, when it reveals it and when other people's opinions enter the experience.

The value is the first encounter.

House Dark should create the feeling of arriving at a premiere before reviews, trailers, clips and discourse have told you what to expect.

### Product shorthand

- Six words before. Your words after.
- The picture speaks first.
- Trust people, not percentages.

### House Dark is not

- a streaming catalogue
- a review database
- an infinite recommendation feed
- a poster wall
- a score or ratings product
- a social network built around likes or follower counts

## 2. Current member architecture

### Tonight

House Dark chooses the nightly Opening. The title is sealed until the No Trailer finishes.

### Search

The label can remain `SEARCH` for comprehension, but the product behaviour is **Trust Us**. The member does not browse titles. They give House Dark a theme or territory. House Dark gives them one recommendation.

### Circle

Trusted people. Receive a film Under Seal and send a film Under Seal to a friend or Circle.

### Library

A personal archive of watched, saved and meaningful films. It must feel like an archive, not a CMS table.

### The Room

Post-watch social space with three modes:

1. Your Review
2. Your Circle
3. The House

No likes, scores, ranking or comment-thread UI.

### Me / You

Account and preferences if present in the current product.

## 3. Tonight, exact product flow

This is the highest-priority rule in the build.

### Pre reveal

The Home / Tonight surface shows:

- House Dark identity
- Opening number
- `TONIGHT IS SEALED`
- a restrained clue action
- countdown / opening status when relevant
- no title
- no year
- no runtime if runtime itself materially identifies the film; otherwise runtime may be shown if the current product policy already permits it
- no director
- no cast
- no poster
- no synopsis
- no recognisable still
- no title in HTML metadata or accessibility strings

The Room is closed because the film is not watched.

### Ritual

`TONIGHT IS SEALED`

→ member deliberately enters the clue

→ clue object becomes the No Trailer frame

→ member presses Play

→ original House Dark No Trailer plays for the full 10 seconds

→ picture goes to black

→ 300 to 500 ms black hold

→ server reveal is recorded

→ only now does the server return the film identity

→ title reveal

→ post-reveal House state

The title cannot be present in the client before that reveal request succeeds.

### Post reveal

Now show:

- title
- year
- runtime
- safe availability / legal watch destination
- `MARK WATCHED`

The Room remains closed until the member marks the film watched or otherwise becomes eligible under the production watch-state rules.

### Post watch

Prompt:

`SIX WORDS AFTER THE PICTURE`

`What stayed with you?`

Allow 1 to 6 words, optional.

Actions:

- `LEAVE MY SIX WORDS`
- `SKIP FOR NOW`

Skip still unlocks The Room. Do not guilt the member and do not create a fake blank review.

## 4. Search is Trust Us

This replaces any title catalogue or autocomplete-first approach for the main Search experience.

### Core interaction

The member tells House Dark what they are in the mood for.

Examples:

- Tension
- Longing
- Obsession
- Escape
- Power
- Childhood
- Jealousy
- Ambition
- Memory
- Something strange

MVP can use one theme at a time. If the production system supports multiple territories cleanly, allow up to three, but do not turn this into filter configuration.

Then House Dark chooses **one** film.

The recommendation screen shows only:

`HOUSE DARK RECOMMENDS`

Film title

Year, optional and quiet

`SIX WORDS BEFORE THE PICTURE`

One exact six-word, spoiler-safe line

Actions:

- `TRUST US`
- `SEEN IT`

### Seen it

`SEEN IT` must not send the member back to a list.

The current recommendation physically leaves the frame and House Dark gives the next recommendation for the same theme.

Repeat until the member accepts or changes theme.

### Trust us

`TRUST US` closes the information down rather than opening more detail.

Final state:

`THAT'S ALL YOU GET.`

`GO IN BLIND.`

From here the member can save the recommendation, open a verified watch destination, or place it in their Library depending on the production product state. Do not reveal synopsis, cast, reviews, posters, ratings or trailers.

### Recommendation generation

Use a deterministic cached House Dark record for each film, not a fresh LLM generation on every request.

Suggested record:

```ts
{
  filmId,
  sixWordsBefore,
  territories: string[],
  pace,
  intensity,
  editorialApprovedAt,
  generatedAt,
  version
}
```

The six-word line must be exactly six words under the project's word-count rules. Validate and reject unsafe lines.

## 5. The Room

The Room only makes sense after the picture.

### Header

- Opening number
- film title, because the member is now eligible
- `THE ROOM`

### Modes

#### Your Review

The member's own six words are the dominant typographic object.

If they skipped, show a quiet invitation to add them later. Do not invent words.

#### Your Circle

Reviews from people the member trusts.

Show member name quietly, with the review itself as the visual material.

#### The House

Wider eligible House Dark responses.

No popularity ordering. Use editorial/randomised/recent sampling without exposing engagement counts.

### Visual behaviour

The Room is not three card grids.

It is a spatial typography environment. The words are the scenery.

As the member scrolls:

- one review approaches and grows
- another moves past and softens
- another sits at the edge of the field
- brass rules extend to mark progression
- the film title and the member's own words remain stable enough to orient the member

Names stay secondary.

### Scroll implementation rule

Do not use raw `window.scrollY` without accounting for the Room section's own position.

Use a dedicated scroll scene with a sticky viewport and calculate:

```ts
progress = clamp((window.scrollY - roomSceneTop) / (roomSceneHeight - window.innerHeight), 0, 1);
```

Or use an equivalent local scroll container.

Update transforms in `requestAnimationFrame`. Keep one source of truth for progress. Test at 430 px mobile, common desktop sizes and after navigation into the Room from another route.

## 6. Circle

Circle has two equal responsibilities.

### Incoming: Under Seal

The recipient initially sees:

- `A FILM IS WAITING.`
- sender name
- closed seal object
- no film identity

Opening the object is a deliberate interaction. The same object should persist and change state rather than disappear into a loading screen.

After opening, show only the information allowed by the private recommendation rules. If the recommendation itself is designed to reveal the title, reveal it inside the same object.

### Outgoing: Send Under Seal

A member can recommend a film to a friend or Circle.

Flow:

1. Choose a recipient
2. Choose a film from Library / recent films / exact known-title search
3. Optional short note or six-word cue, depending on current data model
4. Review sealed preview
5. `SEND UNDER SEAL`

The recipient must never see the sender's film-selection interface.

### Send motion

The recommendation object compresses to roughly 80 to 85 percent, the seam closes, there is a short hold, then:

`SENT UNDER SEAL`

Do not replace it with a toast as the main feedback.

### Social privacy

No public follower counts. No dominant avatars. No activity feed that exposes private viewing history outside the intended Circle.

## 7. Library

Library is a personal film archive.

Requirements:

- title search filters instantly
- search title, year and Opening number where useful
- `Nothing under that title.` empty state
- Add a watched film from a broad metadata catalogue
- records unfold in place
- selected title persists and grows into detail
- surrounding records make room rather than disappearing into a generic route transition
- close reverses the unfolding behaviour and preserves scroll position

The Library can use title data because it contains films the member has already saved, watched or deliberately added.

## 8. Home after reveal

The nightly Opening is an event, not the permanent homepage.

After reveal, the broader House state can contain:

1. Current Opening hero
2. Room preview if eligible
3. Under Seal if a film is waiting
4. Trust Us / Search invitation
5. Recent Library
6. Next Opening countdown

Do not present six equal dashboard cards. Build an editorial composition with clear hierarchy.

## 9. Countdown

Use one canonical `nextOpeningAt` timestamp.

Calculate remaining time from the timestamp every second. Do not store and decrement a counter.

At zero, refresh or invalidate Opening state without requiring a hard page reload.

Do not announce every second to screen readers.

## 10. No Trailer

The No Trailer is an original House Dark mood study, not a compressed trailer.

It communicates emotional weather, not story information.

Rules:

- 10 seconds
- explicit member press before playback
- silent by default
- no copyrighted film footage
- no actor likenesses
- no recognisable locations or plot events
- no title cards or readable text
- no existing music or dialogue
- media failure gets a proper Retry state
- do not silently skip to reveal

`media/The Drummer's Solitary, Silent Prelude.mp4` is the existing Whiplash reference asset supplied for House Dark work. `media/no-trailer-dev-test-10s.mp4` is a lightweight developer test asset only. Do not mistake either for a universal production master.

## 11. Public / entry experience

The entry can be visually memorable without becoming a fake cinema lobby.

The approved direction is a premium projection aperture.

The site begins in darkness. A controlled field of warm optical light partially reveals the House Dark wordmark. The pointer can move the light slightly. The effect should feel precise and expensive, not nostalgic or distressed.

Primary action:

`ENTER IN THE DARK`

The entry is a brand moment. It is not the Tonight title reveal.

## 12. Success test

The product should make someone think:

> I know enough to trust this, but not enough to spoil the first encounter.

If a feature gives the member more context because it is conventional UX, remove it.
