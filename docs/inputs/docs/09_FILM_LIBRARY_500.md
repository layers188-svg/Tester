# House Dark 500 film library

## Status

This is now the **canonical recommendation universe for Trust Us**.

The supplied 500-film set replaces the earlier idea of an endless or open-ended recommendation repository for the member-facing Search / Trust Us experience.

Do not build an infinite catalogue behind Trust Us. Do not ask an LLM or external movie API to discover arbitrary titles for each request.

The production candidate set is finite, deliberate and human-curated.

## Included files

- `data/house_dark_500_films.xlsx` — original source workbook
- `data/house_dark_500_films.json` — normalized build format
- `data/house_dark_500_films.csv` — portable import format
- `data/house_dark_theme_map.json` — 20 intent-led theme definitions
- `data/house_dark_500_validation.json` — validation summary

Validation at handover:

- 500 films
- 500 unique titles
- 20 primary themes
- 25 films per theme
- every supplied blind synopsis is exactly six whitespace-separated words
- all 500 rows are marked spoiler-safe

## Product rule

The dataset exists to power this interaction:

`member intent → House Dark chooses ONE film → title + six words → TRUST US / SEEN IT`

It does **not** exist to create a browse page.

Never render the 500 titles as a member-facing grid, list, infinite scroll, carousel or filterable catalogue.

## Canonical themes

1. `I want to feel tense` — Pressure-driven films built around suspense, pursuit or tightening stakes.
2. `I want to be scared` — Horror chosen for atmosphere, dread and the feeling that something is wrong.
3. `I want a mystery` — Films driven by unanswered questions, investigation, hidden motives or uncertain truth.
4. `I want something mind-bending` — Reality slips, identity blurs and the film keeps asking you to reconsider what you saw.
5. `I want big adventure` — Large-scale journeys, quests, chases and worlds that reward surrendering to the ride.
6. `I want science-fiction wonder` — Speculative films built around wonder, discovery, future worlds and big human questions.
7. `I want romance without clichés` — Love stories with friction, restraint, ambiguity and people who feel real.
8. `I want heartbreak` — Films that land emotionally through grief, loss, regret, sacrifice or quiet devastation.
9. `I want something warm` — Gentle, generous films that restore faith in people without becoming saccharine.
10. `I want to laugh` — Comedies that still work as films, from verbal wit to visual chaos.
11. `I want dark comedy` — Films that find humour inside power, violence, failure, social discomfort or moral rot.
12. `I want coming-of-age` — Young people forming identities, leaving home, finding freedom or seeing adulthood clearly.
13. `I want family drama` — Families under pressure, where love, history and resentment live in the same room.
14. `I want friendship and connection` — Films about the people who make isolation bearable, whether briefly or for life.
15. `I want crime and moral compromise` — Crime stories where professionalism, loyalty, greed and conscience keep colliding.
16. `I want ambition and obsession` — People who want something badly enough to sacrifice work, love, identity or sanity.
17. `I want power and politics` — Films about institutions, ideology, propaganda, resistance and who gets to control the story.
18. `I want war and survival` — War seen through survival, moral compromise, resistance and ordinary human consequence.
19. `I want music and performance` — Films where performance is work, identity, escape, obsession or pure joy.
20. `I want something beautiful and strange` — Films where image, rhythm and atmosphere matter as much as conventional plot.

The free-text input may match synonyms through the supplied `searchTags`, but it resolves into these curated theme territories rather than into an unlimited external catalogue.

## Selection logic

1. Normalize the member's chosen theme or free-text intent.
2. Resolve it to one or more of the 20 House Dark themes.
3. Build a candidate set from the 500-film corpus only.
4. Exclude:
   - films the member has explicitly marked `SEEN IT`
   - films already recommended in the current sequence
   - films already in watched history when the product has reliable history
   - unavailable / blocked titles only if availability filtering is enabled
5. Rank deterministically using the theme match and any approved House Dark editorial weighting.
6. Return exactly one recommendation.
7. `SEEN IT` advances to the next eligible film using the same theme and exclusion set.
8. Do not make the member choose the theme again after `SEEN IT`.
9. Persist or session-cache the exclusion set so the same title does not immediately cycle back.
10. If the 25-film primary theme is exhausted, broaden deliberately to a related House Dark theme or reset only with an explicit product rule. Do not silently fall back to the entire internet.

## Six-word copy

Use the supplied `sixWordBlindSynopsis` as the approved line.

Do not regenerate it on each request.

If editors change a line later:

- preserve version history
- validate exactly six whitespace-separated words
- run spoiler safety review
- record editorial approval
- do not publish an automated replacement without review

## External movie data providers

A movie metadata provider can still be used for:

- verified watch destinations
- availability
- runtime / year verification
- Library exact-title add
- admin enrichment
- canonical external IDs

It must **not** be the recommendation candidate universe for Trust Us.

The 500-film corpus is the recommendation universe until House Dark deliberately curates and ships a new version.

## Data model suggestion

```ts
type HouseDarkFilm = {
  hdId: number
  externalFilmId?: string
  title: string
  year: number
  decade: string
  primarySearchTheme: string
  sixWordBlindSynopsis: string
  searchTags: string[]
  canonAnchor?: string
  spoilerSafe: true
  editorialVersion: number
  active: boolean
}
```

Import the 500 films into the existing film model where possible rather than creating a second competing film table.

## Search copy note

The workbook's historical implementation note says to hide title and year during recommendation. The **latest product decision in `docs/00_BUILD_BRIEF_FINAL.md` wins**: after the House has chosen, show the single recommended title plus its six-word blind line. Do not reveal anything further.

## Acceptance condition

Trust Us is correct only when an automated test can prove that every recommendation candidate comes from the active 500-film corpus and the member never receives a multi-title result.
