# House Dark motion system

## 1. Motion thesis

**Still interface. Strong transformations.**

House Dark should be quiet when nothing is happening and cinematic when a state changes.

Do not build transitions between pages. Build transformations of objects within the House.

The reference quality bar is not "has animations". The test is:

**Can you watch one state physically become the next?**

## 2. Reference environments

### Siena Film Foundation
https://siena.film/

Use as the primary reference for a continuous spatial system. The important lesson is that navigation feels like moving through film rather than clicking between screens. Movement, depth and direct manipulation belong to one coherent world.

House Dark translation:

- the interface is one House
- scroll changes composition, not just vertical position
- key objects persist
- movement has direction and inertia
- environment responds to focus

Do not copy Siena's visual identity.

### Seasoned by Koto
https://seasoned.koto.studio/

Use for the idea that an object can become the next interface rather than disappearing and being replaced.

House Dark translation:

- sealed card becomes clue frame
- clue frame becomes No Trailer surface
- recommendation becomes sealed acceptance state
- Library record becomes detail

### Mouthful of Dust
https://www.slv.vic.gov.au/mouthful-of-dust/

Use for direct manipulation and environmental response.

House Dark translation:

- hold, drag or dim actions can cause a reveal
- the member should sometimes cause the state change physically rather than click a button and watch an animation

Do not add 3D spectacle for its own sake.

### PP Fragment
https://pp-fragment.com/

Use for typography as visual material.

House Dark translation:

- The Room is made of words
- reviews have scale, depth, position and rhythm
- typography is scenery, not copy inside cards

## 3. Motion principles

1. Persistent objects over page replacement.
2. A fade alone does not count.
3. Scale, position, crop, focus and light should change meaningfully.
4. No bounce, spring or overshoot.
5. Avoid 3 to 5 px micro motion as the main effect.
6. Use transforms, opacity, clip paths and masks before layout thrashing.
7. Use direct manipulation only when it reinforces the product action.
8. Mobile gets equivalent choreography, not a static fallback.
9. Reduced motion preserves all state changes and clarity.
10. Rendered behaviour is the source of truth.

## 4. Timing tokens

| Token | Range | Use |
| --- | ---: | --- |
| FAST | 150 to 220 ms | tactile response, small controls |
| STANDARD | 280 to 360 ms | panel changes, dimming, supporting state |
| SLOW | 450 to 650 ms | structural composition changes |
| CINEMATIC | 650 to 900 ms | signature object transformation |
| HOLD | 200 to 500 ms | black, seal, reveal punctuation |

Suggested easing:

`cubic-bezier(.18,.82,.18,1)`

A calmer alternative for long object movement:

`cubic-bezier(.22,.61,.36,1)`

## 5. Premium site entry

### Goal

A memorable entry to the House that feels optical, contemporary and controlled.

### Do

- begin almost black
- allow a narrow field of warm projection light to find the official wordmark
- use restrained lens bloom
- use extremely subtle dust only inside the light field
- pointer can move the light by a small amount
- wordmark stays crisp and official
- keep typography minimal

### Do not

- fake film scratches
- sepia
- faux Super 8 jitter
- loud film burn
- projector icons
- fake countdown leader
- vintage cinema clichés
- excessive grain

### Timeline

**0 to 300 ms**
Pure dark. No UI chrome.

**300 to 1100 ms**
Warm light gently catches. Wordmark becomes partially legible as the optical field crosses it.

**1100 to 1900 ms**
Light settles. `Find the joy in not knowing.` resolves quietly.

**After 1400 ms**
`ENTER IN THE DARK` can appear.

### Enter transition

On action:

**0 to 220 ms**
Light narrows and concentrates.

**220 to 650 ms**
The iris / aperture closes cleanly around the lit field.

**650 to 1000 ms**
True black hold.

**1000 to 1850 ms**
The House opens from a horizontal slit or controlled aperture. Main composition comes into focus.

**1850 to 2400 ms**
Navigation and secondary modules resolve after the hero.

The entry must never block interaction forever if animation is interrupted. Add a timeout safety path.

## 6. Tonight sealed to clue

The sealed Opening is the hero object.

It must not contain title text at all.

Interaction:

- surrounding information recedes 40 to 80 px
- global field dims over roughly 360 ms
- the sealed frame survives
- frame moves toward centre and grows
- safe clue resolves inside the same frame

If using press and hold, releasing early should return the object to sealed state without breaking routing.

## 7. Clue to No Trailer

The clue frame becomes playback.

Do not navigate to a new page.

- clue copy recedes
- same frame expands toward full playback geometry
- controls reduce to `NO TRAILER / 10 SECONDS / PLAY`
- member presses Play
- chrome recedes
- progress is minimal

No autoplay.

## 8. No Trailer to reveal

This is the product's most important cinematic beat.

At media end:

1. Picture reaches black.
2. Hold 300 to 500 ms.
3. Reveal surface enters.
4. Only after server reveal response is available does the title appear.
5. Title should be still and legible. Do not animate it like a trailer title card.

A useful motion idea is for the black playback surface to contract into a thin line or aperture, then allow Programme Paper or the post-reveal field to grow from that geometry.

## 9. Reveal to House

The revealed title persists.

- title remains one logical object
- support information recedes
- composition changes around it
- title changes scale and position into the post-reveal Home hero
- brass rule can extend into the wider layout
- lower modules resolve after a brief hold

No generic loading state.

## 10. Home to The Room

The Room preview must become the full Room.

Use a shared-layout or fixed overlay / FLIP technique if the component tree makes persistence difficult.

Preferred sequence:

1. Capture preview geometry.
2. Clone / promote the preview into a fixed transition layer.
3. Home content moves back and loses contrast.
4. Preview expands into the Room stage.
5. A Circle quote that was visible in the preview stays visible and relocates.
6. Brass rule extends.
7. `THE ROOM` resolves.
8. Additional voices enter at different depth.
9. Transition layer hands back to the real Room DOM.

Duration: 700 to 900 ms.

## 11. The Room scroll

The Room is the PP Fragment moment.

Use a 350 to 450 vh scene with a sticky 100 vh viewport.

Calculate local scene progress. Do not infer Room progress from global page scroll without subtracting the Room scene offset.

For each voice, derive:

- y
- x
- scale
- opacity
- blur

from one `roomProgress` value.

Example conceptual mapping:

```ts
const local = clamp((roomProgress - voiceAnchor) / voiceWindow, -1, 1)
const y = local * -90
const scale = 1 + (1 - Math.abs(local)) * 0.22
const opacity = 0.12 + (1 - Math.abs(local)) * 0.88
const blur = Math.abs(local) * 6
```

Do not copy these numbers blindly. Tune visually.

Important:

- Your Review anchors the Room.
- Circle voices feel nearer and more personal.
- House voices can exist deeper in the field.
- names remain quiet metadata.
- no review cards.

## 12. Search / Trust Us motion

Search begins with themes, not films.

Theme selection can cause the chosen word to move into a central decision line while unused themes recede.

Then the environment clears and House Dark gives one film.

Recommendation reveal:

- title enters as one confident typographic object
- six-word line mask-reveals after the title is mostly settled
- no carousel of alternatives

`SEEN IT`:

- current recommendation scrubs laterally out of the field
- use speed-responsive blur during the movement
- next recommendation enters from the continuing direction
- the member never sees a list

`TRUST US`:

- title and six words compress into a small sealed / held state
- supporting UI disappears
- short hold
- `THAT'S ALL YOU GET. GO IN BLIND.`

## 13. Circle motion

### Incoming

The closed object survives opening.

- environment darkens
- seal line changes
- object grows / unfolds
- safe information resolves inside it

No `Opening...` interstitial.

### Outgoing

After the recipient and film are chosen:

- object compresses to 80 to 85 percent
- seam closes
- 200 to 300 ms hold
- seal mark resolves
- `SENT UNDER SEAL`

## 14. Library motion

Selected record grows and unfolds in place.

- title persists
- adjacent rows make room
- metadata resolves after the main title movement
- close reverses the transform
- preserve scroll position

Avoid modal cards floating above an unchanged list.

## 15. Navigation

Navigation can remain persistent, but destination changes should not trigger generic route interstitials.

Supporting content can resolve 24 to 60 px with opacity, but every signature destination must have a stronger material transformation of its own.

## 16. Implementation technique

Use native View Transitions, shared layout, FLIP or a fixed overlay clone for signature transitions.

A robust fixed-overlay sequence:

1. `getBoundingClientRect()` source.
2. Clone or promote the source visual.
3. Position clone fixed over source.
4. Render destination hidden and measure target geometry.
5. Animate clone transform and size.
6. At roughly 60 percent, resolve destination environment.
7. Remove clone and reveal destination object.

This is preferable to trying to hide router unmounts with fades.

## 17. Motion QA

Do not approve motion by reading CSS.

For every signature sequence:

- render in a real browser
- record or inspect intermediate frames
- verify geometry actually changes
- verify no state flashes before it should
- verify motion remains obvious at normal speed
- verify mobile
- verify keyboard path
- verify reduced motion

If motion can only be identified frame by frame, it is too subtle.
