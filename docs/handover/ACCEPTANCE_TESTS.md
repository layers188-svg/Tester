# Acceptance tests

Claude Code should turn these into automated tests where practical and complete the remainder as rendered QA.

## A. Title leak tests

1. Load Tonight in sealed state.
2. Search raw HTML / RSC payload / JSON for the protected title.
3. Assert zero title matches.
4. Assert zero title matches in document title, meta tags, Open Graph, alt text, aria labels and asset URLs.
5. Assert analytics events before reveal do not include title or protected film identifier if that identifier can be resolved client side.
6. Assert notifications and deep-link previews are title free.
7. Assert the title is not returned until the reveal endpoint succeeds after No Trailer completion.

For the Whiplash fixture, the word `Whiplash` must be absent from all sealed responses.

## B. Tonight critical path

1. Sealed state renders.
2. Clue can be opened by pointer and keyboard.
3. No Trailer requires explicit Play.
4. The full media runs.
5. Media end triggers black hold.
6. Reveal request occurs after media end.
7. Title first appears only after reveal response.
8. Post reveal state shows Mark Watched.
9. Mark Watched opens the six-word after prompt.
10. Submit 1 to 6 words works.
11. Seven words is rejected.
12. Skip for now works without creating a fake review.
13. Submitted and skipped states can enter The Room.
14. Refresh preserves server state.

## C. No Trailer failure

1. Force video error.
2. `RETRY` is shown.
3. Title remains protected.
4. A retry can complete the flow.
5. A failed animation does not leave a blocking overlay.

## D. Trust Us / Search

1. Initial state shows themes, no film catalogue.
2. Select `Ambition`.
3. Exactly one recommendation appears.
4. Recommendation contains title and exact six-word line only, plus permitted quiet metadata.
5. No poster, cast, synopsis, rating or reviews.
6. `SEEN IT` replaces the film without returning to a list.
7. New recommendation stays within the same theme.
8. `TRUST US` closes to `THAT'S ALL YOU GET. GO IN BLIND.`
9. Changing theme starts a new recommendation sequence.

## E. The Room

1. Room cannot open before eligibility.
2. After watch eligibility, Room opens.
3. Modes are `YOUR REVIEW`, `YOUR CIRCLE`, `THE HOUSE`.
4. Your Review shows the member's own words or a quiet add-later invitation.
5. Circle shows only eligible Circle reviews.
6. House shows eligible House reviews.
7. No likes, scores, ranks, popularity or follower counts.
8. Scroll changes review geometry visibly.
9. Scroll works after entering the Room from Home, not only on a direct page load.
10. Test 430 px mobile.
11. Test desktop.
12. Test reduced motion.

## F. Circle

### Incoming

1. Recipient initially sees no title.
2. Sender identity is shown if permitted.
3. Open Under Seal transforms the existing object.
4. No generic loading interstitial.

### Outgoing

1. Choose a friend.
2. Choose a film from allowed sources.
3. Send button remains disabled until required inputs exist.
4. Send Under Seal completes.
5. Confirmation uses the sealed object itself.
6. Recipient preview is title free.
7. Recipient never receives the sender's film-search UI.

## G. Library

1. Search `Burning`.
2. Search `Mood`.
3. Search `Whiplash`.
4. Search nonexistent film.
5. Clear search.
6. Add `Past Lives`, 2023.
7. Persist added film.
8. Open a record and confirm in-place unfolding.
9. Close and preserve scroll.

## H. Motion QA

For every signature motion:

1. Record or inspect intermediate frames.
2. Confirm a meaningful position, scale, crop, focus or layout change.
3. Confirm no title leaks during the motion.
4. Confirm motion is visible at normal speed.
5. Confirm no bounce / spring overshoot.
6. Confirm mobile equivalent.
7. Confirm reduced-motion path remains understandable.

## I. Entry

1. First frame is not a dead black screen.
2. Within a short deterministic delay, the projection field becomes visible.
3. Pointer changes the light field without moving it excessively.
4. Enter closes the optical field.
5. A deliberate black hold occurs.
6. House opens and becomes interactive.
7. A timeout safety path removes the intro overlay if an animation event is missed.
8. Entry is replayable in staging.

## J. General

- no console errors
- no dead buttons
- no generic spinners where a state transformation is specified
- no fake user counts
- no copyrighted film visual assets
- official SVG identity only
- all back actions work
- keyboard navigation works
- touch targets are at least 44 px
