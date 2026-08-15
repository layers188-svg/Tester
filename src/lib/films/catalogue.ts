import type { FilmFacts, FilmProvider, FilmSuggestion } from "./types";

/**
 * A small local catalogue, used when no metadata key is configured.
 *
 * Not a mock in the sense of a stub that pretends: it is a real
 * provider over a real, small dataset, and everything downstream of it
 * — caching, validation, the six-word contract, the whole Search
 * journey — runs exactly as it does against TMDB. Swapping in a key
 * widens the catalogue and changes nothing else.
 *
 * It exists because Search that cannot be used until someone buys an
 * API key is Search that nobody has reviewed. The films here are the
 * ones House Dark has already programmed plus the fixtures in the
 * Search brief, so the feature can be walked end to end today.
 *
 * `synopsis` is present because the editorial engine takes factual
 * context. It never leaves the server.
 */
interface CatalogueEntry extends FilmFacts {
  /**
   * The house's own six words, where they have been written by hand.
   *
   * These are seeds for the record, not a bypass of validation: they go
   * through the same exactly-six-words check as anything a model
   * returns, because a typo here would otherwise be the one description
   * that escaped it.
   */
  editorial?: {
    sixWordPlot: string;
    territory: string[];
    pace: string;
    intensity: string;
  };
}

const CATALOGUE: CatalogueEntry[] = [
  {
    provider: "catalogue",
    externalId: "whiplash-2014",
    title: "Whiplash",
    releaseYear: 2014,
    runtimeMinutes: 106,
    genres: ["Drama", "Music"],
    synopsis:
      "A young jazz drummer at a competitive conservatory comes under the instruction of a teacher who believes cruelty produces greatness.",
    editorial: {
      sixWordPlot: "Drummer chases greatness under brutal mentorship.",
      territory: ["Ambition", "Obsession", "Power"],
      pace: "Relentless",
      intensity: "High",
    },
  },
  {
    // The duplicate title the brief asks Search to disambiguate.
    provider: "catalogue",
    externalId: "whiplash-2002",
    title: "Whiplash",
    releaseYear: 2002,
    runtimeMinutes: 88,
    genres: ["Thriller"],
    synopsis: "A man's life unravels after a road accident.",
  },
  {
    provider: "catalogue",
    externalId: "parasite-2019",
    title: "Parasite",
    releaseYear: 2019,
    runtimeMinutes: 132,
    genres: ["Drama", "Thriller"],
    synopsis:
      "A family living in a semi-basement apartment begins working, one by one, for a wealthy household.",
    editorial: {
      sixWordPlot: "Struggling family enters wealthy household's orbit.",
      territory: ["Class", "Deception", "Pressure"],
      pace: "Building",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "portrait-2019",
    title: "Portrait of a Lady on Fire",
    releaseYear: 2019,
    runtimeMinutes: 122,
    genres: ["Drama", "Romance"],
    synopsis:
      "On a remote island, a painter is commissioned to paint a wedding portrait of a young woman without her knowing.",
    editorial: {
      sixWordPlot: "Painter observes woman she must portray.",
      territory: ["Desire", "Memory", "Restraint"],
      pace: "Measured",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "burning-2018",
    title: "Burning",
    releaseYear: 2018,
    runtimeMinutes: 148,
    genres: ["Drama", "Mystery"],
    synopsis:
      "A young deliveryman reconnects with a woman from his childhood, and later meets a wealthy man she has befriended.",
    editorial: {
      sixWordPlot: "Young man searches through unsettling absence.",
      territory: ["Jealousy", "Doubt", "Obsession"],
      pace: "Slow",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "florida-project-2017",
    title: "The Florida Project",
    releaseYear: 2017,
    runtimeMinutes: 111,
    genres: ["Drama"],
    synopsis:
      "A six-year-old and her friends spend a summer in a budget motel outside Orlando while her mother struggles to pay the rent.",
    editorial: {
      sixWordPlot: "Childhood flourishes beside adult instability daily.",
      territory: ["Childhood", "Precarity", "Freedom"],
      pace: "Wandering",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "in-the-mood-for-love-2000",
    title: "In the Mood for Love",
    releaseYear: 2000,
    runtimeMinutes: 98,
    genres: ["Drama", "Romance"],
    synopsis:
      "Two neighbours in 1960s Hong Kong come to suspect their spouses of an affair, and begin spending time together.",
    editorial: {
      sixWordPlot: "Neighbours grow close at impossible moment.",
      territory: ["Longing", "Restraint", "Timing"],
      pace: "Measured",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "moonlight-2016",
    title: "Moonlight",
    releaseYear: 2016,
    runtimeMinutes: 111,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A boy becomes himself in chapters.",
      territory: ["Identity", "Tenderness", "Silence"],
      pace: "Measured",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "lost-in-translation-2003",
    title: "Lost in Translation",
    releaseYear: 2003,
    runtimeMinutes: 102,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Two strangers drift through a city.",
      territory: ["Loneliness", "Connection", "Displacement"],
      pace: "Drifting",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "there-will-be-blood-2007",
    title: "There Will Be Blood",
    releaseYear: 2007,
    runtimeMinutes: 158,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Oilman builds an empire from nothing.",
      territory: ["Greed", "Faith", "Power"],
      pace: "Building",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "no-country-2007",
    title: "No Country for Old Men",
    releaseYear: 2007,
    runtimeMinutes: 122,
    genres: ["Thriller"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A hunter takes money not his.",
      territory: ["Fate", "Pursuit", "Violence"],
      pace: "Relentless",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "arrival-2016",
    title: "Arrival",
    releaseYear: 2016,
    runtimeMinutes: 116,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Linguist is asked to translate visitors.",
      territory: ["Language", "Grief", "Time"],
      pace: "Measured",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "her-2013",
    title: "Her",
    releaseYear: 2013,
    runtimeMinutes: 126,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Lonely writer falls for a voice.",
      territory: ["Loneliness", "Intimacy", "Technology"],
      pace: "Gentle",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "roma-2018",
    title: "Roma",
    releaseYear: 2018,
    runtimeMinutes: 135,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Housekeeper holds a family through change.",
      territory: ["Class", "Care", "Memory"],
      pace: "Observational",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-handmaiden-2016",
    title: "The Handmaiden",
    releaseYear: 2016,
    runtimeMinutes: 145,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A maid enters a strange house.",
      territory: ["Deception", "Desire", "Control"],
      pace: "Building",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "oldboy-2003",
    title: "Oldboy",
    releaseYear: 2003,
    runtimeMinutes: 120,
    genres: ["Thriller"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Man imprisoned for years seeks answers.",
      territory: ["Vengeance", "Captivity", "Obsession"],
      pace: "Relentless",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "memories-of-murder-2003",
    title: "Memories of Murder",
    releaseYear: 2003,
    runtimeMinutes: 132,
    genres: ["Crime"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Rural detectives hunt an unseen killer.",
      territory: ["Futility", "Obsession", "Doubt"],
      pace: "Building",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "drive-2011",
    title: "Drive",
    releaseYear: 2011,
    runtimeMinutes: 100,
    genres: ["Thriller"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Quiet driver takes dangerous night work.",
      territory: ["Loyalty", "Violence", "Restraint"],
      pace: "Coiled",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "blade-runner-2049-2017",
    title: "Blade Runner 2049",
    releaseYear: 2017,
    runtimeMinutes: 164,
    genres: ["Science Fiction"],
    synopsis: null,
    editorial: {
      sixWordPlot: "An officer follows a buried case.",
      territory: ["Memory", "Identity", "Loneliness"],
      pace: "Slow",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "fury-road-2015",
    title: "Mad Max: Fury Road",
    releaseYear: 2015,
    runtimeMinutes: 120,
    genres: ["Action"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Prisoners flee across a hostile desert.",
      territory: ["Survival", "Freedom", "Momentum"],
      pace: "Relentless",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "spirited-away-2001",
    title: "Spirited Away",
    releaseYear: 2001,
    runtimeMinutes: 125,
    genres: ["Animation"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Girl works to free her parents.",
      territory: ["Wonder", "Courage", "Transformation"],
      pace: "Flowing",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "past-lives-2023",
    title: "Past Lives",
    releaseYear: 2023,
    runtimeMinutes: 105,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Childhood friends meet again decades later.",
      territory: ["Longing", "Choice", "Distance"],
      pace: "Gentle",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "aftersun-2022",
    title: "Aftersun",
    releaseYear: 2022,
    runtimeMinutes: 102,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Father and daughter share a holiday.",
      territory: ["Memory", "Fatherhood", "Distance"],
      pace: "Drifting",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "lives-of-others-2006",
    title: "The Lives of Others",
    releaseYear: 2006,
    runtimeMinutes: 137,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "An agent listens to a playwright.",
      territory: ["Surveillance", "Conscience", "Control"],
      pace: "Measured",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "amelie-2001",
    title: "Amélie",
    releaseYear: 2001,
    runtimeMinutes: 122,
    genres: ["Comedy"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Shy woman quietly arranges others' happiness.",
      territory: ["Whimsy", "Solitude", "Kindness"],
      pace: "Brisk",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "city-of-god-2002",
    title: "City of God",
    releaseYear: 2002,
    runtimeMinutes: 130,
    genres: ["Crime"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Boys grow up inside a favela.",
      territory: ["Violence", "Ambition", "Survival"],
      pace: "Kinetic",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "pans-labyrinth-2006",
    title: "Pan's Labyrinth",
    releaseYear: 2006,
    runtimeMinutes: 118,
    genres: ["Fantasy"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Girl finds a labyrinth during wartime.",
      territory: ["Fantasy", "Cruelty", "Escape"],
      pace: "Measured",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "under-the-skin-2013",
    title: "Under the Skin",
    releaseYear: 2013,
    runtimeMinutes: 108,
    genres: ["Science Fiction"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A woman drives, watching lone men.",
      territory: ["Alienation", "Predation", "Strangeness"],
      pace: "Hypnotic",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-master-2012",
    title: "The Master",
    releaseYear: 2012,
    runtimeMinutes: 138,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Drifter falls in with a movement.",
      territory: ["Belonging", "Control", "Damage"],
      pace: "Slow",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "phantom-thread-2017",
    title: "Phantom Thread",
    releaseYear: 2017,
    runtimeMinutes: 130,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Dressmaker brings a woman into order.",
      territory: ["Control", "Obsession", "Devotion"],
      pace: "Measured",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "anatomy-of-a-fall-2023",
    title: "Anatomy of a Fall",
    releaseYear: 2023,
    runtimeMinutes: 151,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A death, and a marriage examined.",
      territory: ["Truth", "Marriage", "Doubt"],
      pace: "Measured",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "zone-of-interest-2023",
    title: "The Zone of Interest",
    releaseYear: 2023,
    runtimeMinutes: 105,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A family keeps house beside horror.",
      territory: ["Complicity", "Banality", "Denial"],
      pace: "Still",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "tar-2022",
    title: "Tár",
    releaseYear: 2022,
    runtimeMinutes: 158,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Conductor stands at her career's height.",
      territory: ["Power", "Reputation", "Control"],
      pace: "Measured",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "perfect-days-2023",
    title: "Perfect Days",
    releaseYear: 2023,
    runtimeMinutes: 124,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A man cleans toilets in Tokyo.",
      territory: ["Routine", "Contentment", "Solitude"],
      pace: "Gentle",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "eeaao-2022",
    title: "Everything Everywhere All at Once",
    releaseYear: 2022,
    runtimeMinutes: 139,
    genres: ["Science Fiction"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Overwhelmed woman is pulled between worlds.",
      territory: ["Family", "Chaos", "Regret"],
      pace: "Frantic",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "social-network-2010",
    title: "The Social Network",
    releaseYear: 2010,
    runtimeMinutes: 120,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Student builds something that outgrows him.",
      territory: ["Ambition", "Betrayal", "Status"],
      pace: "Brisk",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "prisoners-2013",
    title: "Prisoners",
    releaseYear: 2013,
    runtimeMinutes: 153,
    genres: ["Thriller"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Two girls vanish on a street.",
      territory: ["Desperation", "Faith", "Doubt"],
      pace: "Grinding",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "sicario-2015",
    title: "Sicario",
    releaseYear: 2015,
    runtimeMinutes: 121,
    genres: ["Thriller"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Agent joins a task force blind.",
      territory: ["Complicity", "Power", "Dread"],
      pace: "Tense",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "nightcrawler-2014",
    title: "Nightcrawler",
    releaseYear: 2014,
    runtimeMinutes: 117,
    genres: ["Thriller"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Man finds work filming city crime.",
      territory: ["Ambition", "Voyeurism", "Amorality"],
      pace: "Driven",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "ex-machina-2014",
    title: "Ex Machina",
    releaseYear: 2014,
    runtimeMinutes: 108,
    genres: ["Science Fiction"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Programmer visits an inventor's remote house.",
      territory: ["Control", "Intelligence", "Manipulation"],
      pace: "Measured",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "cmbyn-2017",
    title: "Call Me by Your Name",
    releaseYear: 2017,
    runtimeMinutes: 132,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Summer, and a guest who stays.",
      territory: ["Desire", "Youth", "Memory"],
      pace: "Languid",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "little-miss-sunshine-2006",
    title: "Little Miss Sunshine",
    releaseYear: 2006,
    runtimeMinutes: 101,
    genres: ["Comedy"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Family drives daughter to a pageant.",
      territory: ["Family", "Failure", "Persistence"],
      pace: "Brisk",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "manchester-2016",
    title: "Manchester by the Sea",
    releaseYear: 2016,
    runtimeMinutes: 137,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A man returns to his hometown.",
      territory: ["Grief", "Duty", "Silence"],
      pace: "Slow",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "a-separation-2011",
    title: "A Separation",
    releaseYear: 2011,
    runtimeMinutes: 123,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A marriage ends and blame spreads.",
      territory: ["Duty", "Class", "Truth"],
      pace: "Escalating",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "shoplifters-2018",
    title: "Shoplifters",
    releaseYear: 2018,
    runtimeMinutes: 121,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A family lives outside the rules.",
      territory: ["Family", "Poverty", "Belonging"],
      pace: "Gentle",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "uncut-gems-2019",
    title: "Uncut Gems",
    releaseYear: 2019,
    runtimeMinutes: 135,
    genres: ["Thriller"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Jeweller keeps betting on one more.",
      territory: ["Compulsion", "Debt", "Nerve"],
      pace: "Frantic",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "first-reformed-2017",
    title: "First Reformed",
    releaseYear: 2017,
    runtimeMinutes: 113,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A pastor counsels a troubled parishioner.",
      territory: ["Faith", "Despair", "Conviction"],
      pace: "Still",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-witch-2015",
    title: "The Witch",
    releaseYear: 2015,
    runtimeMinutes: 92,
    genres: ["Horror"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A family farms alone near woods.",
      territory: ["Faith", "Isolation", "Suspicion"],
      pace: "Slow",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "hereditary-2018",
    title: "Hereditary",
    releaseYear: 2018,
    runtimeMinutes: 127,
    genres: ["Horror"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A family grieves after a death.",
      territory: ["Grief", "Inheritance", "Dread"],
      pace: "Building",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "get-out-2017",
    title: "Get Out",
    releaseYear: 2017,
    runtimeMinutes: 104,
    genres: ["Horror"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Man meets his girlfriend's parents upstate.",
      territory: ["Race", "Unease", "Control"],
      pace: "Building",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "lady-bird-2017",
    title: "Lady Bird",
    releaseYear: 2017,
    runtimeMinutes: 94,
    genres: ["Comedy"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Teenager wants out of her hometown.",
      territory: ["Adolescence", "Mothers", "Ambition"],
      pace: "Brisk",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "before-sunrise-1995",
    title: "Before Sunrise",
    releaseYear: 1995,
    runtimeMinutes: 101,
    genres: ["Romance"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Two travellers walk a city overnight.",
      territory: ["Connection", "Time", "Chance"],
      pace: "Wandering",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "eternal-sunshine-2004",
    title: "Eternal Sunshine of the Spotless Mind",
    releaseYear: 2004,
    runtimeMinutes: 108,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Couple considers erasing their shared memory.",
      territory: ["Memory", "Love", "Regret"],
      pace: "Fragmented",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "stalker-1979",
    title: "Stalker",
    releaseYear: 1979,
    runtimeMinutes: 162,
    genres: ["Science Fiction"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A guide leads two men inside.",
      territory: ["Faith", "Desire", "Mystery"],
      pace: "Slow",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "come-and-see-1985",
    title: "Come and See",
    releaseYear: 1985,
    runtimeMinutes: 142,
    genres: ["War"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A boy joins partisans during war.",
      territory: ["War", "Innocence", "Horror"],
      pace: "Harrowing",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "paris-texas-1984",
    title: "Paris, Texas",
    releaseYear: 1984,
    runtimeMinutes: 145,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A man emerges from the desert.",
      territory: ["Memory", "Family", "Distance"],
      pace: "Slow",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "chungking-express-1994",
    title: "Chungking Express",
    releaseYear: 1994,
    runtimeMinutes: 102,
    genres: ["Romance"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Two policemen drift through Hong Kong.",
      territory: ["Longing", "Chance", "Solitude"],
      pace: "Kinetic",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "y-tu-mama-2001",
    title: "Y Tu Mamá También",
    releaseYear: 2001,
    runtimeMinutes: 106,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Two boys and a woman travel.",
      territory: ["Youth", "Desire", "Friendship"],
      pace: "Roaming",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-piano-1993",
    title: "The Piano",
    releaseYear: 1993,
    runtimeMinutes: 121,
    genres: ["Drama"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Mute woman arrives with her piano.",
      territory: ["Desire", "Voice", "Possession"],
      pace: "Measured",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "seven-samurai-1954",
    title: "Seven Samurai",
    releaseYear: 1954,
    runtimeMinutes: 207,
    genres: ["Action"],
    synopsis: null,
    editorial: {
      sixWordPlot: "A village hires men to defend.",
      territory: ["Duty", "Sacrifice", "Community"],
      pace: "Building",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "rear-window-1954",
    title: "Rear Window",
    releaseYear: 1954,
    runtimeMinutes: 112,
    genres: ["Thriller"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Injured photographer watches his neighbours' windows.",
      territory: ["Voyeurism", "Suspicion", "Confinement"],
      pace: "Building",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-thing-1982",
    title: "The Thing",
    releaseYear: 1982,
    runtimeMinutes: 109,
    genres: ["Horror"],
    synopsis: null,
    editorial: {
      sixWordPlot: "Isolated researchers cannot trust each other.",
      territory: ["Paranoia", "Isolation", "Dread"],
      pace: "Building",
      intensity: "High",
    },
  },

  /*
   * -------------------------------------------------------------------
   * The films people actually type.
   *
   * The entries above are the house's own programming. These are the
   * ones a member reaches for when they open Search: the films that
   * come up in conversation, get recommended, get argued about.
   *
   * They are here because the alternative was worse. Search went to a
   * model for any film the house had not described, which meant "La La
   * Land" answered "the house has nothing on that one" unless somebody
   * was paying for an API key — a mainstream title failing on a billing
   * question. Hand-written six words need no key, no quota and no
   * network; they are exactly six by construction rather than by retry;
   * and they are better, because a person choosing the six words that
   * matter beats a model averaging what a synopsis said.
   *
   * The wide index still sits behind these for the long tail, and the
   * editorial engine still writes anything neither covers. This is the
   * floor, and it is now high enough that most searches never reach
   * past it.
   * -------------------------------------------------------------------
   */
  {
    provider: "catalogue",
    externalId: "la-la-land",
    title: "La La Land",
    releaseYear: 2016,
    runtimeMinutes: 128,
    genres: ["Drama", "Music", "Romance"],
    synopsis:
      "A jazz pianist and an aspiring actress fall in love in Los Angeles while each pursues a career that pulls them apart.",
    editorial: {
      sixWordPlot: "Two dreamers meet where ambition wins.",
      territory: ["Love", "Ambition", "Compromise"],
      pace: "Buoyant",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-godfather",
    title: "The Godfather",
    releaseYear: 1972,
    runtimeMinutes: 175,
    genres: ["Crime", "Drama"],
    synopsis:
      "The youngest son of a crime family returns from the war intending to stay outside the business.",
    editorial: {
      sixWordPlot: "A son inherits what he refused.",
      territory: ["Family", "Power", "Duty"],
      pace: "Stately",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "pulp-fiction",
    title: "Pulp Fiction",
    releaseYear: 1994,
    runtimeMinutes: 154,
    genres: ["Crime", "Drama"],
    synopsis:
      "Interlocking stories of hitmen, a boxer and a gangster's wife in Los Angeles, told out of sequence.",
    editorial: {
      sixWordPlot: "Crime stories fold into each other.",
      territory: ["Chance", "Violence", "Talk"],
      pace: "Springy",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "fight-club",
    title: "Fight Club",
    releaseYear: 1999,
    runtimeMinutes: 139,
    genres: ["Drama", "Thriller"],
    synopsis:
      "A sleepless office worker meets a soap salesman and together they start an underground club.",
    editorial: {
      sixWordPlot: "An insomniac finds a violent outlet.",
      territory: ["Identity", "Rage", "Consumption"],
      pace: "Escalating",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "goodfellas",
    title: "Goodfellas",
    releaseYear: 1990,
    runtimeMinutes: 145,
    genres: ["Crime", "Drama"],
    synopsis:
      "A boy grows up idolising the gangsters in his neighbourhood and spends his life among them.",
    editorial: {
      sixWordPlot: "Belonging to the crew costs everything.",
      territory: ["Loyalty", "Ambition", "Decay"],
      pace: "Propulsive",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-shawshank-redemption",
    title: "The Shawshank Redemption",
    releaseYear: 1994,
    runtimeMinutes: 142,
    genres: ["Drama"],
    synopsis:
      "A banker convicted of murder builds a life and a friendship over decades inside a state penitentiary.",
    editorial: {
      sixWordPlot: "A banker keeps hope inside prison.",
      territory: ["Hope", "Endurance", "Friendship"],
      pace: "Patient",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "inception",
    title: "Inception",
    releaseYear: 2010,
    runtimeMinutes: 148,
    genres: ["Science Fiction", "Thriller"],
    synopsis:
      "A team of specialists enter dreams to steal secrets, and are asked instead to plant one.",
    editorial: {
      sixWordPlot: "Thieves work inside other people's dreams.",
      territory: ["Memory", "Guilt", "Architecture"],
      pace: "Propulsive",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "interstellar",
    title: "Interstellar",
    releaseYear: 2014,
    runtimeMinutes: 169,
    genres: ["Science Fiction", "Drama"],
    synopsis:
      "A former pilot joins a mission through a wormhole to find a habitable world as Earth fails.",
    editorial: {
      sixWordPlot: "A father leaves Earth for time.",
      territory: ["Love", "Time", "Survival"],
      pace: "Expansive",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-dark-knight",
    title: "The Dark Knight",
    releaseYear: 2008,
    runtimeMinutes: 152,
    genres: ["Action", "Crime", "Drama"],
    synopsis:
      "A masked vigilante and a district attorney face an anarchist who wants to prove everyone will break.",
    editorial: {
      sixWordPlot: "A city tests its protector's limits.",
      territory: ["Order", "Chaos", "Sacrifice"],
      pace: "Relentless",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "se7en",
    title: "Se7en",
    releaseYear: 1995,
    runtimeMinutes: 127,
    genres: ["Crime", "Thriller"],
    synopsis:
      "A retiring detective and his replacement track a murderer who arranges killings around the deadly sins.",
    editorial: {
      sixWordPlot: "Two detectives follow a moralising killer.",
      territory: ["Sin", "Dread", "Futility"],
      pace: "Grim",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "taxi-driver",
    title: "Taxi Driver",
    releaseYear: 1976,
    runtimeMinutes: 114,
    genres: ["Drama", "Crime"],
    synopsis:
      "An insomniac cab driver in New York becomes fixated on rescuing people who have not asked him to.",
    editorial: {
      sixWordPlot: "A lonely driver decides to act.",
      territory: ["Isolation", "Violence", "Delusion"],
      pace: "Simmering",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "apocalypse-now",
    title: "Apocalypse Now",
    releaseYear: 1979,
    runtimeMinutes: 147,
    genres: ["War", "Drama"],
    synopsis:
      "A captain is sent up a river during the Vietnam War to find and remove a colonel who has gone rogue.",
    editorial: {
      sixWordPlot: "A soldier travels upriver toward madness.",
      territory: ["War", "Madness", "Myth"],
      pace: "Hypnotic",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "2001-a-space-odyssey",
    title: "2001: A Space Odyssey",
    releaseYear: 1968,
    runtimeMinutes: 149,
    genres: ["Science Fiction"],
    synopsis:
      "From prehistory to deep space, humanity encounters an object that appears at each leap forward.",
    editorial: {
      sixWordPlot: "Humanity meets something it cannot explain.",
      territory: ["Evolution", "Machines", "Awe"],
      pace: "Glacial",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "alien",
    title: "Alien",
    releaseYear: 1979,
    runtimeMinutes: 117,
    genres: ["Science Fiction", "Horror"],
    synopsis:
      "The crew of a commercial towing ship is woken early to investigate a transmission from a nearby moon.",
    editorial: {
      sixWordPlot: "A crew answers a distress signal.",
      territory: ["Isolation", "Dread", "Survival"],
      pace: "Tightening",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "jaws",
    title: "Jaws",
    releaseYear: 1975,
    runtimeMinutes: 124,
    genres: ["Thriller", "Adventure"],
    synopsis:
      "A police chief on a summer island wants the beaches shut, and the people who profit from them do not.",
    editorial: {
      sixWordPlot: "A resort town will not close.",
      territory: ["Denial", "Fear", "Duty"],
      pace: "Building",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-shining",
    title: "The Shining",
    releaseYear: 1980,
    runtimeMinutes: 146,
    genres: ["Horror", "Drama"],
    synopsis:
      "A writer takes a job as winter caretaker of a remote hotel and moves his wife and son in.",
    editorial: {
      sixWordPlot: "A family winters alone in emptiness.",
      territory: ["Isolation", "Madness", "Inheritance"],
      pace: "Creeping",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "casablanca",
    title: "Casablanca",
    releaseYear: 1942,
    runtimeMinutes: 102,
    genres: ["Drama", "Romance"],
    synopsis:
      "An American running a nightclub in wartime Morocco is confronted by the woman who left him.",
    editorial: {
      sixWordPlot: "An old love arrives during wartime.",
      territory: ["Love", "Duty", "Exile"],
      pace: "Measured",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "vertigo",
    title: "Vertigo",
    releaseYear: 1958,
    runtimeMinutes: 128,
    genres: ["Thriller", "Mystery"],
    synopsis: "A retired detective with a fear of heights is hired to follow an old friend's wife.",
    editorial: {
      sixWordPlot: "A detective follows a woman obsessively.",
      territory: ["Obsession", "Illusion", "Guilt"],
      pace: "Spiralling",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "psycho",
    title: "Psycho",
    releaseYear: 1960,
    runtimeMinutes: 109,
    genres: ["Horror", "Thriller"],
    synopsis: "A secretary drives out of the city with stolen money and pulls in for the night.",
    editorial: {
      sixWordPlot: "A woman stops at one motel.",
      territory: ["Secrecy", "Fear", "Watching"],
      pace: "Sharp",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "citizen-kane",
    title: "Citizen Kane",
    releaseYear: 1941,
    runtimeMinutes: 119,
    genres: ["Drama"],
    synopsis: "After a newspaper magnate dies, reporters try to work out what his last word meant.",
    editorial: {
      sixWordPlot: "Reporters chase one dying man's word.",
      territory: ["Power", "Memory", "Loneliness"],
      pace: "Stately",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "schindlers-list",
    title: "Schindler's List",
    releaseYear: 1993,
    runtimeMinutes: 195,
    genres: ["Drama", "History"],
    synopsis:
      "An industrialist profits from the war and then begins buying the freedom of the people working for him.",
    editorial: {
      sixWordPlot: "A businessman spends everything on lives.",
      territory: ["Complicity", "Mercy", "Horror"],
      pace: "Unflinching",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "forrest-gump",
    title: "Forrest Gump",
    releaseYear: 1994,
    runtimeMinutes: 142,
    genres: ["Drama", "Romance"],
    synopsis:
      "A man from Alabama passes through several decades of American life, mostly by accident.",
    editorial: {
      sixWordPlot: "A gentle man walks through history.",
      territory: ["Chance", "Devotion", "America"],
      pace: "Ambling",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "titanic",
    title: "Titanic",
    releaseYear: 1997,
    runtimeMinutes: 194,
    genres: ["Drama", "Romance"],
    synopsis:
      "A young woman travelling first class and an artist travelling steerage meet on an ocean liner.",
    editorial: {
      sixWordPlot: "Two strangers meet aboard one crossing.",
      territory: ["Class", "Love", "Catastrophe"],
      pace: "Sweeping",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-matrix",
    title: "The Matrix",
    releaseYear: 1999,
    runtimeMinutes: 136,
    genres: ["Science Fiction", "Action"],
    synopsis:
      "A software engineer who moonlights as a hacker is contacted by people who say the world is not what it seems.",
    editorial: {
      sixWordPlot: "A programmer learns the world's shape.",
      territory: ["Reality", "Control", "Awakening"],
      pace: "Kinetic",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "gladiator",
    title: "Gladiator",
    releaseYear: 2000,
    runtimeMinutes: 155,
    genres: ["Action", "Drama"],
    synopsis:
      "A Roman general is betrayed after the emperor's death and ends up fighting in the arena.",
    editorial: {
      sixWordPlot: "A general is stripped of everything.",
      territory: ["Vengeance", "Honour", "Empire"],
      pace: "Grand",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "heat",
    title: "Heat",
    releaseYear: 1995,
    runtimeMinutes: 170,
    genres: ["Crime", "Drama"],
    synopsis:
      "A career criminal planning a last job and the detective pursuing him lead strangely similar lives.",
    editorial: {
      sixWordPlot: "Thief and detective mirror each other.",
      territory: ["Discipline", "Loneliness", "Craft"],
      pace: "Deliberate",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "fargo",
    title: "Fargo",
    releaseYear: 1996,
    runtimeMinutes: 98,
    genres: ["Crime", "Drama"],
    synopsis:
      "A car salesman arranges something small to solve a money problem, and a pregnant police chief investigates.",
    editorial: {
      sixWordPlot: "A small plan goes badly wrong.",
      territory: ["Greed", "Snow", "Decency"],
      pace: "Deadpan",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-big-lebowski",
    title: "The Big Lebowski",
    releaseYear: 1998,
    runtimeMinutes: 117,
    genres: ["Comedy", "Crime"],
    synopsis: "A man in Los Angeles is mistaken for a millionaire who shares his name.",
    editorial: {
      sixWordPlot: "Mistaken identity disturbs a quiet life.",
      territory: ["Confusion", "Leisure", "Nihilism"],
      pace: "Loose",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "trainspotting",
    title: "Trainspotting",
    releaseYear: 1996,
    runtimeMinutes: 93,
    genres: ["Drama"],
    synopsis:
      "A group of friends in Edinburgh move in and out of heroin addiction and each other's schemes.",
    editorial: {
      sixWordPlot: "Edinburgh friends chase the next high.",
      territory: ["Addiction", "Friendship", "Escape"],
      pace: "Frantic",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "amadeus",
    title: "Amadeus",
    releaseYear: 1984,
    runtimeMinutes: 160,
    genres: ["Drama", "Music"],
    synopsis:
      "An ageing court composer recalls his encounters with a younger musician whose talent he cannot match.",
    editorial: {
      sixWordPlot: "A court composer meets undeniable genius.",
      territory: ["Envy", "Genius", "Faith"],
      pace: "Operatic",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "raging-bull",
    title: "Raging Bull",
    releaseYear: 1980,
    runtimeMinutes: 129,
    genres: ["Drama", "Sport"],
    synopsis:
      "A middleweight boxer's jealousy and rage wreck his relationships as his career rises and falls.",
    editorial: {
      sixWordPlot: "A boxer destroys everything outside boxing.",
      territory: ["Jealousy", "Violence", "Ruin"],
      pace: "Brutal",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "chinatown",
    title: "Chinatown",
    releaseYear: 1974,
    runtimeMinutes: 130,
    genres: ["Mystery", "Drama"],
    synopsis:
      "A private investigator taking a routine adultery case finds himself inside a dispute over water rights.",
    editorial: {
      sixWordPlot: "A detective pulls at city water.",
      territory: ["Corruption", "Secrets", "Power"],
      pace: "Unhurried",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "blade-runner",
    title: "Blade Runner",
    releaseYear: 1982,
    runtimeMinutes: 117,
    genres: ["Science Fiction"],
    synopsis:
      "A retired officer is brought back to find four escaped artificial humans in a rain-soaked city.",
    editorial: {
      sixWordPlot: "A hunter questions what counts alive.",
      territory: ["Memory", "Mortality", "Rain"],
      pace: "Languid",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "back-to-the-future",
    title: "Back to the Future",
    releaseYear: 1985,
    runtimeMinutes: 116,
    genres: ["Adventure", "Comedy"],
    synopsis: "A high school student is sent thirty years into the past by his friend's invention.",
    editorial: {
      sixWordPlot: "A teenager visits his parents' youth.",
      territory: ["Family", "Time", "Chance"],
      pace: "Brisk",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "jurassic-park",
    title: "Jurassic Park",
    releaseYear: 1993,
    runtimeMinutes: 127,
    genres: ["Adventure", "Science Fiction"],
    synopsis:
      "Scientists are invited to inspect an island attraction before it opens to the public.",
    editorial: {
      sixWordPlot: "A park opens before anyone's ready.",
      territory: ["Wonder", "Hubris", "Nature"],
      pace: "Escalating",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-silence-of-the-lambs",
    title: "The Silence of the Lambs",
    releaseYear: 1991,
    runtimeMinutes: 118,
    genres: ["Thriller", "Crime"],
    synopsis:
      "A trainee FBI agent is sent to interview an imprisoned psychiatrist about an active case.",
    editorial: {
      sixWordPlot: "A trainee bargains with a prisoner.",
      territory: ["Fear", "Intellect", "Power"],
      pace: "Tightening",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "good-will-hunting",
    title: "Good Will Hunting",
    releaseYear: 1997,
    runtimeMinutes: 126,
    genres: ["Drama"],
    synopsis:
      "A young man working as a caretaker at a university turns out to be a mathematical prodigy.",
    editorial: {
      sixWordPlot: "A janitor solves what professors cannot.",
      territory: ["Talent", "Grief", "Trust"],
      pace: "Warm",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "mulholland-drive",
    title: "Mulholland Drive",
    releaseYear: 2001,
    runtimeMinutes: 147,
    genres: ["Mystery", "Drama"],
    synopsis:
      "An aspiring actress arriving in Los Angeles finds a woman with no memory hiding in her apartment.",
    editorial: {
      sixWordPlot: "A newcomer meets an amnesiac stranger.",
      territory: ["Dreams", "Identity", "Hollywood"],
      pace: "Drifting",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "oppenheimer",
    title: "Oppenheimer",
    releaseYear: 2023,
    runtimeMinutes: 180,
    genres: ["Drama", "History"],
    synopsis:
      "The theoretical physicist who led the wartime laboratory that developed the first nuclear weapons.",
    editorial: {
      sixWordPlot: "A physicist builds something never undone.",
      territory: ["Conscience", "Power", "Consequence"],
      pace: "Relentless",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "poor-things",
    title: "Poor Things",
    releaseYear: 2023,
    runtimeMinutes: 141,
    genres: ["Drama", "Comedy"],
    synopsis:
      "A woman brought back to life by an unorthodox surgeon sets out to see the world on her own terms.",
    editorial: {
      sixWordPlot: "A remade woman decides her appetites.",
      territory: ["Freedom", "Appetite", "Invention"],
      pace: "Buoyant",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "dune",
    title: "Dune",
    releaseYear: 2021,
    runtimeMinutes: 155,
    genres: ["Science Fiction", "Adventure"],
    synopsis:
      "A noble house is given stewardship of a desert planet that is the source of the empire's most valuable substance.",
    editorial: {
      sixWordPlot: "A family inherits a hostile planet.",
      territory: ["Destiny", "Power", "Desert"],
      pace: "Monumental",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-holdovers",
    title: "The Holdovers",
    releaseYear: 2023,
    runtimeMinutes: 133,
    genres: ["Drama", "Comedy"],
    synopsis:
      "A disliked teacher, a student with nowhere to go and the head cook spend the winter holiday at a boarding school.",
    editorial: {
      sixWordPlot: "Three strangers share an empty school.",
      territory: ["Loneliness", "Grief", "Care"],
      pace: "Gentle",
      intensity: "Low",
    },
  },
  {
    provider: "catalogue",
    externalId: "killers-of-the-flower-moon",
    title: "Killers of the Flower Moon",
    releaseYear: 2023,
    runtimeMinutes: 206,
    genres: ["Drama", "Crime", "History"],
    synopsis:
      "After oil is found on Osage land in 1920s Oklahoma, members of the community begin to be murdered.",
    editorial: {
      sixWordPlot: "Wealth arrives, and so do killings.",
      territory: ["Greed", "Complicity", "Betrayal"],
      pace: "Deliberate",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "anora",
    title: "Anora",
    releaseYear: 2024,
    runtimeMinutes: 139,
    genres: ["Drama", "Comedy"],
    synopsis:
      "A dancer from Brooklyn marries the son of a wealthy family, and his parents send people to undo it.",
    editorial: {
      sixWordPlot: "A whirlwind marriage meets its consequences.",
      territory: ["Class", "Illusion", "Endurance"],
      pace: "Frantic",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "challengers",
    title: "Challengers",
    releaseYear: 2024,
    runtimeMinutes: 131,
    genres: ["Drama", "Romance", "Sport"],
    synopsis:
      "A former tennis prodigy turned coach enters her husband in a low-level tournament against his old friend.",
    editorial: {
      sixWordPlot: "Three players circle one another endlessly.",
      territory: ["Desire", "Rivalry", "Control"],
      pace: "Charged",
      intensity: "High",
    },
  },
  {
    provider: "catalogue",
    externalId: "all-of-us-strangers",
    title: "All of Us Strangers",
    releaseYear: 2023,
    runtimeMinutes: 105,
    genres: ["Drama", "Romance"],
    synopsis:
      "A screenwriter living in a near-empty London tower block begins a relationship with a neighbour and revisits his childhood home.",
    editorial: {
      sixWordPlot: "A writer returns to childhood rooms.",
      territory: ["Grief", "Loneliness", "Tenderness"],
      pace: "Hushed",
      intensity: "Medium",
    },
  },
  {
    provider: "catalogue",
    externalId: "the-substance",
    title: "The Substance",
    releaseYear: 2024,
    runtimeMinutes: 141,
    genres: ["Horror", "Drama"],
    synopsis:
      "A television fitness presenter dropped for being too old is offered an experimental treatment.",
    editorial: {
      sixWordPlot: "A star takes a promised youth.",
      territory: ["Vanity", "Horror", "Ageing"],
      pace: "Escalating",
      intensity: "High",
    },
  },
];

/** Case and punctuation insensitive, so "portrait of a lady" finds it. */
function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const catalogueProvider: FilmProvider = {
  name: "catalogue",

  async search(query: string): Promise<FilmSuggestion[]> {
    const q = normalise(query);
    if (q.length === 0) return [];

    return (
      CATALOGUE.filter((entry) => normalise(entry.title).includes(q))
        // Newest first, so the film someone means by "Whiplash" is usually
        // the one at the top without them having to think about it.
        .sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0))
        .map((entry) => ({
          provider: entry.provider,
          externalId: entry.externalId,
          title: entry.title,
          releaseYear: entry.releaseYear,
        }))
    );
  },

  async facts(externalId: string): Promise<FilmFacts | null> {
    return CATALOGUE.find((entry) => entry.externalId === externalId) ?? null;
  },
};

/** The hand-written six words for a catalogue film, if it has any. */
export function catalogueEditorial(externalId: string): CatalogueEntry["editorial"] | null {
  return CATALOGUE.find((entry) => entry.externalId === externalId)?.editorial ?? null;
}

/**
 * Every hand-written entry, so the test suite can hold all of them to
 * the six-word rule rather than a list someone remembered to update.
 */
export function allCatalogueEditorial(): {
  externalId: string;
  title: string;
  editorial: NonNullable<CatalogueEntry["editorial"]>;
}[] {
  return CATALOGUE.filter((entry) => entry.editorial).map((entry) => ({
    externalId: entry.externalId,
    title: entry.title,
    editorial: entry.editorial!,
  }));
}
