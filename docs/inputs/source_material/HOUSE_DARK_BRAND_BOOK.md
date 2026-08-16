# House Dark brand and product book

Version 1.0  
August 2026

This is the source of truth for anyone designing, writing, marketing or building House Dark. If a new idea conflicts with the principle below, the idea changes. The principle does not.

## The idea in one line

The best film experiences happen when you know nothing.

## The public proposition

Trailers, reviews and the internet tell you the whole plot. House Dark gives you the excitement of entering a film blind.

## What House Dark is

House Dark is a private picture house on your phone. One human chosen film opens each night. Before the reveal, a member gets feeling, rhythm and content care, but no title, synopsis, score, cast, poster, recognisable footage or story material.

It brings an old way of watching into a modern product:

1. Trust the programmer.
2. Enter without context.
3. Let the film introduce itself.
4. Talk after the picture.

House Dark is not another catalogue. It is not a review database. It is not a recommendation engine dressed as an editorial brand. It is a ritual built around restraint.

## Brand essence

### Purpose

Restore surprise to watching films.

### Promise

House Dark will protect the unknown until the member chooses to enter.

### Point of view

More information does not always make a better decision. In film culture, it can remove the very thing that makes a first watch irreplaceable.

### Enemy

Pre explanation. Plot heavy trailers. Review aggregates. Endless browse screens. Algorithmic sameness. The pressure to know what everyone else thinks before feeling anything yourself.

### Emotional result

Anticipation before. Attention during. Conversation after.

### Brand behaviour

Restraint, confidence, care, taste, privacy and a little ceremony.

## The name

House Dark describes both a place and an action. The house is the community. Dark is the moment the outside world disappears and the picture begins.

Always write the name as `House Dark` in title case. Use `HOUSE DARK` only in compact interface labels, programme marks and utility typography. Never shorten it to HD in public copy unless it appears as a small production code such as `HD 043`.

## Positioning

For people who love films but are tired of having them explained in advance, House Dark is a private picture house that introduces one human chosen film without revealing the story. Unlike streaming catalogues, review platforms or trailer feeds, House Dark protects surprise and moves conversation to after the picture.

## Audience

### Primary audience

Film curious people aged roughly 20 to 45 who watch between two and ten films a month, use at least one streaming service and feel exhausted by choice. They do not need to identify as cinephiles. They need to value discovery, taste and trust.

### Core mindsets

**The context exhausted viewer**  
They have seen the trailer, score, cast, thumbnail and discourse before pressing play. They miss being surprised.

**The trusted recommender**  
Friends already ask them what to watch. House Dark gives that social behaviour a better object: a private opening with the title withheld.

**The film ritualist**  
They want watching to feel intentional again. Programmes, streaks and a private archive give the habit shape without turning it into a leaderboard.

**The quiet enthusiast**  
They care about films but dislike public reviewing, hot takes and performative expertise. Six words and private Circles lower the social pressure.

### Audience we do not chase

People looking only for exhaustive listings, instant consensus, plot summaries, celebrity news, public follower counts or a conventional streaming catalogue. House Dark can still serve them later, but it must not reshape itself around those expectations.

## Product principles

### 1. The title is data, not decoration

Until the reveal, the current title must not reach the client. It must not appear in HTML, API payloads, notifications, analytics properties, image paths, filenames, link previews, error messages or accessibility labels.

### 2. Feeling without story

Before reveal, House Dark can communicate emotional temperature, pace, texture, language or content care. It cannot communicate plot, character, setting, recognisable objects, famous lines, cast, poster art or score.

### 3. Social after picture

Circle activity, six word reviews and discussion stay sealed until the member has revealed or watched the film. Nobody else should be able to pre frame the experience.

### 4. Human taste is visible

House Dark says `human chosen`, names guest programmers and explains why a programme exists. Automation supports production and operations. It does not become the public author.

### 5. Finite beats endless

One nightly opening. Short programmes. A clear finish line. No infinite recommendation feed.

### 6. Private by default

History, saves, reviews and Circles are private unless the member deliberately shares them.

### 7. Ceremony must still be usable

The dimmer, ticket, house opening and film language create anticipation. They must not slow repeat members, hide basic navigation or make the app feel like a themed restaurant.

## Product architecture

House Dark is phone first and has four permanent tabs.

### Tonight

The daily ritual.

Key states:

1. Sealed: edition number, house time, three safe cues and content notes only.
2. Entering: member dims the house or begins the opening.
3. No Trailer: a ten second original spoiler safe film.
4. Revealed: title, year and runtime appear.
5. Handoff: House Dark opens only a verified direct playback destination.
6. After: save, mark watched, leave six words and enter conversation.

### Circle

Trust people, not percentages.

Core features:

* Sealed inbox
* Send Under Seal
* Private openings from friends
* One person or whole Circle sending
* Circle screenings
* Title free notifications
* After Credits rooms
* Six word reactions after watching

### Library

A private film record, not a public scorecard.

Core features:

* Previous House Dark selections
* Watched and saved films
* Six word reviews
* Browse by feeling
* Finite programmes
* Guest programmes
* Film history import without ratings
* Year in Film

### You

The member's seat and controls.

Core features:

* Membership
* Install on phone
* Service preferences
* Availability alerts
* Import history
* Reminder and privacy settings
* Owner only programming desk
* Owner only house health

## The private opening journey

This is the central product growth loop.

### Sender

1. Opens Circle.
2. Taps `SEND A FILM UNDER SEAL`.
3. Chooses one friend or a whole Circle.
4. Chooses a film from their House Dark library.
5. Uses the approved three safe cues.
6. Adds a short personal note.
7. Reviews the exact title free preview.
8. Sends the private opening.

### Recipient

1. Receives `A film is waiting under seal`.
2. Sees the sender, note and safe cues, but no title, year, poster or runtime.
3. Accepts unseen or dismisses without penalty.
4. Opens the private opening.
5. Watches that film's approved No Trailer.
6. Receives the title from the server only after the film finishes.
7. Watches through a protected handoff.
8. Marks watched and leaves six words.
9. The sender is invited back to see the response.

## The No Trailer system

### Definition

A No Trailer is an original ten second film that carries emotional temperature without carrying story information.

It is not a trailer with fewer shots. It is not a plot summary made abstract. It is not a reusable brand ident. It is not the same stick figure treatment applied to every title.

### Creative direction

Every selected film receives a distinct visual treatment chosen from a broad material language:

* Architectural light
* Macro material
* Practical shadow
* Tactile stop motion
* Graphic rhythm
* Hand processed image
* Optical colour
* Miniature set
* Ink motion
* Restrained line

The visual method changes with the emotional logic of the film. The House Dark authorship is held by duration, restraint, typography, sound discipline and the reveal sequence, not by repeating the same animation.

### Required production pipeline

1. Programmer writes a mood only brief.
2. The system creates three materially different treatments.
3. Automated checks reject title, names, faces, characters, locations, plot events, recognisable objects, protected footage and protected music.
4. A rights check confirms every visual and audio element is owned or licensed.
5. A human editor approves the master.
6. The film is uploaded to private storage with an opaque filename.
7. The approved asset is attached to the film record.
8. The same approved asset can introduce the nightly opening and friend sent private openings for that film.

### Human approval is permanent

No automated confidence score can publish a No Trailer. A named human editor must approve every master. If there is doubt, remove the clue.

## Membership model

### Free

* One nightly opening
* Unlimited receiving of private openings
* One Circle
* One send each rolling week
* Six word reviews
* Ten saves
* Thirty day archive

### House Member

* Unlimited private opening sends
* Unlimited Circles
* Full archive and history import
* Personal film rituals and annual record
* Availability alerts
* Private screenings
* Guest programmes
* Three private requests

Target public price:

* A$4.99 monthly
* A$39 annually

During private beta, House Member access is active and no payment is collected. A member must actively agree before any paid plan starts.

## Voice

### How House Dark sounds

Calm. Specific. Literate. Human. Confident enough to leave space.

House Dark does not shout about disruption. It does not sound like a streaming service, a luxury hotel or a film school lecture. It speaks like a programmer welcoming someone into a room they have prepared carefully.

### Sentence behaviour

* Use short declarative sentences for product truth.
* Use one precise image instead of three vague adjectives.
* Prefer verbs: enter, dim, hold, seal, reveal, watch, leave, return.
* Let the member act. Do not narrate every interaction.
* Use film language only when it clarifies the ritual.
* Keep exclamation marks exceptional.
* Avoid visible dash punctuation in interface copy.

### Approved language

* The best film experiences happen when you know nothing.
* Leave the internet in the lobby.
* The picture is better without it.
* Trust people, not percentages.
* One film is waiting under seal.
* Title withheld.
* Human chosen.
* Open private opening.
* Now you know. Nothing else.
* Talk after the picture.
* Six words. No score.

### Banned language

* Your next obsession
* Curated just for you
* Movie magic
* Cinematic journey
* Where stories come alive
* Reimagining entertainment
* Powered by AI
* Game changing
* Seamless experience
* Discover hidden gems
* Elevate your movie night
* A world of content at your fingertips
* Cinephiles unite
* Lights, camera, action

Do not use fake intimacy, generic rhetorical questions, inflated superlatives, excessive sentence fragments or emoji as a substitute for a point of view.

## Naming system

Use a small, coherent vocabulary.

| Product object | Name |
| --- | --- |
| Daily selection | Opening |
| Spoiler safe introduction | No Trailer |
| Friend recommendation | Private opening |
| Send action | Send Under Seal |
| Trusted group | Circle |
| Post watch space | After Credits |
| Short reaction | Six word review |
| Curated sequence | Programme |
| Saved viewing record | Library |
| Editorial operation | Programming desk |
| Subscriber | House Member |

Never introduce a new theatrical noun when an existing one works. Avoid tickets, ushers, concessions, red carpets and velvet ropes as decorative concepts. The house language should feel structural, not costume like.

## Visual system

### Design idea

Opening night glamour reduced to programme paper, projection light and a dark room. Old school film culture expressed with contemporary typography and phone first interaction.

### Palette

| Token | Hex | Role |
| --- | --- | --- |
| Paper | `#E9E0D0` | Primary warm surface |
| Paper 2 | `#D8CCB8` | Secondary paper and fields |
| Ink | `#080807` | House black |
| Oxblood | `#65131F` | Primary accent and editorial emphasis |
| Brass | `#B9A16C` | Membership, live state and restrained warmth |
| Brown | `#956433` | Secondary status |
| Deep red | `#741724` | Film tone |
| Dusty pink | `#A88187` | Film tone |
| Bottle green | `#36524C` | Film tone |

Black is not pure. Paper is not white. Brass is not gold foil. Oxblood is not a red carpet.

### Typography

**Editorial: Newsreader**  
Use for large statements, titles, quotes and reflective copy. Italic is a controlled contrast, not decoration.

**Utility: Barlow Condensed**  
Use for navigation, labels, programme codes, timing, buttons and metadata.

Typography should carry the brand before illustration does. Large editorial type can touch the emotional register. Small utility type creates the printed programme discipline.

### Layout

* Phone first, portrait first.
* Strong vertical sequence.
* Clear grids and rules.
* Dark feature frames against warm paper.
* One dominant action per state.
* Modals behave like programme sheets, not floating glass cards.
* Desktop can widen the composition but must not invent a second product.

### Image and motion

Use original abstract film studies, physical light, material texture, optical colour and controlled motion. Avoid stock cinema interiors, red carpets, popcorn, clapperboards, film reels, projector icons, generic neon and fake grain piled onto every surface.

Motion should create anticipation:

* House dim: 360 milliseconds
* No Trailer: 10 to 10.5 seconds
* Reveal: still, legible and earned
* Panel movement: under 300 milliseconds
* Reduced motion preference must be respected

### UI character without clutter

Character comes from edition numbers, programme codes, rules, timing, house states, paper, light and type. Do not add decorative cinema objects. If a cue does not explain state, action or hierarchy, remove it.

## Social identity

House Dark social output is not a feed of film clips. It is a public argument for the unknown.

Primary content forms:

1. Black screen manifesto films
2. Ten second original film studies
3. Title withheld product demonstrations
4. Six word member reactions after reveal
5. Programmer notes after the picture
6. Blind watch invitations
7. Cultural observations about over explanation

Never use unlicensed film footage, posters, stills or music. Never reveal a current opening in a thumbnail or caption. If realistic people or scenes are generated, apply the platform's required AI disclosure. Prefer original practical production so the work does not read as synthetic.

## Accessibility

Mystery must never depend on inaccessibility.

* Maintain WCAG AA contrast for body text and controls.
* Provide useful labels without leaking the title.
* Caption spoken audio.
* Provide a reduced motion path.
* Keep touch targets at least 44 pixels.
* Content notes may be specific about care while remaining free of plot.
* Do not use colour as the only status signal.
* The title reveal must be readable by assistive technology only after server release.

## Rights and legal posture

House Dark is an independent film discovery and discussion service. It does not own, produce, license, host, reproduce or distribute the films discussed unless expressly stated.

Film titles, trademarks, artwork, clips, music, metadata and other third party material remain the property of their respective owners. Their appearance does not imply affiliation or endorsement.

No Trailers use only original or properly licensed material. Provider links should go to verified legal playback destinations. Member reviews remain owned by their authors, subject to the limited display permission in the terms.

## Measurement

House Dark optimises for completed rituals and trusted returns, not raw scrolling time.

Primary measures:

* Nightly opening start rate
* No Trailer completion rate
* Reveal to watch intent rate
* Private opening acceptance rate
* Private opening completion rate
* Recipient to sender return rate
* Six word review rate
* Circle invitations accepted
* Day 7 and day 30 retained members
* Weekly active Circles

Guardrail measures:

* Title leak incidents
* No Trailer rejection rate
* Dismissed recommendations
* Notification opt outs
* Rights or moderation incidents
* Unverified playback handoffs

## Decision test

Before shipping anything, ask:

1. Does it protect the unknown?
2. Does it make watching feel more intentional?
3. Does it move social context to after the picture?
4. Does it strengthen trust in people and programming?
5. Does it feel like House Dark without dressing up as cinema?
6. Would a member want to return tomorrow?

If fewer than five answers are yes, the work is not ready.

## Brief for another LLM

When asking an LLM to work on House Dark, begin with this instruction:

> You are working on House Dark, a phone first private picture house built around one rule: the best film experiences happen when you know nothing. Protect the current film title at the server boundary. Use feeling without story before reveal. Keep social activity after the picture. Maintain a restrained system of warm programme paper, house black, oxblood, brass, Newsreader and Barlow Condensed. Do not use cinema clichés, AI styled gradients, glass cards, excessive rounded rectangles, generic startup copy, emoji or unlicensed film material. One dominant action per state. Human taste must remain visible. Read the full brand book before proposing or changing anything.

## Final standard

House Dark should feel as if a very good independent cinema designed a private mobile product, then removed everything that did not improve the first watch.
