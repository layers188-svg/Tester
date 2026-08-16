# Technical integration brief

## Inspect before changing

The current House Dark handover material describes a Next.js / React product with Cloudflare D1, Drizzle and R2. Earlier build work also explored Supabase for public email identity. The actual repository is the authority.

Do not migrate the product database or hosting stack just to match this brief.

## Required production properties

### Title safety

Treat film identity as protected data until reveal eligibility.

Create separate server response shapes for sealed and revealed states. Do not return a full film object and hide fields in the UI.

Example:

```ts
type SealedOpening = {
  openingId: string
  openingNumber: string
  state: 'sealed' | 'clue' | 'trailer'
  safeCues: string[]
  contentNotes?: string[]
  noTrailerUrl: string
  nextOpeningAt?: string
}

type RevealedOpening = SealedOpening & {
  state: 'revealed' | 'watched' | 'room'
  film: {
    id: string
    title: string
    year?: number
    runtimeMinutes?: number
    playback?: PlaybackDestination[]
  }
}
```

Do not serialize `film.title` into sealed page source.

### Reveal endpoint

The title is returned only after the No Trailer completion has been validated / recorded.

The server is the source of truth. Client query parameters are not reveal authority.

### Watch and review states

Keep explicit states such as:

- not_watched
- review_undecided
- review_skipped
- review_submitted

The Room is accessible after the current product's watch eligibility condition, including skip if that is the chosen rule.

### Search / Trust Us

Trust Us uses the supplied finite House Dark 500 corpus as its candidate universe.

Import `data/house_dark_500_films.json` into the existing film model or an equivalent curated recommendation table. Do not create a parallel catalogue if the existing schema can hold these records cleanly.

For production recommendations:

- candidate films come from the active House Dark 500 only
- the 20 supplied themes and search tags resolve free-text intent
- safe six-word copy comes from the curated record and is versioned
- exact word count is validated
- editorial override is possible
- `SEEN IT` adds the film to a per-member/session exclusion set and advances within the same theme
- the same approved film output is stable until a new editorial version is shipped
- an external metadata provider may enrich the selected film with availability, IDs or Library metadata, but it must not become an endless recommendation pool
- no member-facing endpoint returns the whole 500-film list

See `docs/09_FILM_LIBRARY_500.md`.

### Circle

A sealed recommendation record should support:

- sender member
- recipient member or Circle
- film identity protected from recipient until allowed state
- optional safe note / six-word cue
- sent time
- accepted time
- opened time
- revealed time
- watched time
- recipient review status

### Room reviews

Each six-word review should carry:

- author
- film / Opening
- word count validated
- source such as opening, manual library, private recommendation
- visibility: private / Circle / House as supported
- created at

Never display fake engagement counts.

### Countdown

Store a timestamp. Derive the countdown.


### Existing six sample videos

The production repository is expected to already contain six House Dark sample videos.

At the beginning of implementation, inventory those files and create/update a repo-local media manifest. Do not ask the owner to re-upload them unless the repository search proves they are missing.

Use opaque public asset identifiers if any existing filename leaks a film title.

See `docs/10_SAMPLE_VIDEO_ASSETS.md`.

### Assets

No Trailer assets should use opaque identifiers when title leakage through filenames is a risk.

## Staging state simulator

Development and staging only, support equivalent test states:

- sealed
- clue
- trailer
- reveal
- watched
- room

A query parameter or dev control is fine if it cannot change server eligibility in production.

## Accessibility

- WCAG AA contrast
- 44 px touch targets
- keyboard path for every direct-manipulation interaction
- alternative button for press-and-hold / drag actions
- useful labels that do not leak the title
- reduced motion branch
- no second-by-second countdown announcements

## Resilience

- No Trailer playback error shows `RETRY`
- do not auto reveal on failed playback unless the server/product policy explicitly provides a safe fallback
- animation interruption must not strand the user behind an overlay
- navigation must still work if motion is disabled

## Performance

- preload only metadata before No Trailer
- lazy load below-fold media
- avoid large WebGL dependencies unless there is a measured need
- use CSS transforms / WAAPI for most motion
- reserve heavy canvas / WebGL work for a signature experience that cannot be achieved otherwise
