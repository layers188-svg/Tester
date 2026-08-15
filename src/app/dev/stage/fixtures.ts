import type { OpeningSafe, MemberOpeningProgress } from "@/lib/opening/queries";
import type { RoomOpening } from "@/lib/room/queries";
import type { LibraryItem, RoomVoice } from "@/lib/supabase/types";

/**
 * Staging fixtures, from docs/handover/fixtures.json.
 *
 * These are demonstration content for the state simulator and nothing
 * else. They are never seeded, never rendered to a member, and the
 * module is only ever imported by the dev-only /dev/stage route, which
 * refuses to render in production — so no path exists from here into
 * the product (CLAUDE.md rule 4: never substitute fake data for a
 * backend feature; rule 5: never generate people or reviews).
 *
 * The reviews are the handover's own fixture set, and the names in them
 * are the handover's placeholders.
 */

/** The protected title. It is in the fixture reveal payload and nowhere else. */
export const STAGE_TITLE = "Whiplash";

export const stageOpening: OpeningSafe = {
  id: "00000000-0000-4000-8000-000000000001",
  openingNumber: 7,
  opensAt: "2026-08-15T19:00:00.000Z",
  status: "open",
  runtimeMinutes: 106,
  availabilityCount: 3,
  minimumAccessType: "subscription",
  // Served locally for the simulator; noTrailerUrl() passes an
  // absolute path through untouched.
  noTrailerStoragePath: "/dev/stage-no-trailer.webm",
  noTrailerPosterPath: null,
  noTrailerCaptionsPath: null,
  contentNotes: "Sustained verbal abuse. Blood. One car accident.",
  cues: ["Tempo", "Ambition", "Cruelty"],
};

export const stageProgress: MemberOpeningProgress = {
  hasRevealed: false,
  watchState: null,
  hasSkippedReview: false,
  hasSixWords: false,
  sixWordsId: null,
  sixWordsBody: null,
  sixWordsCreatedAt: null,
};

export const stageReveal = {
  title: STAGE_TITLE,
  releaseYear: 2014,
  providers: [
    {
      provider_name: "Example Streaming",
      access_type: "subscription" as const,
      deep_link: "https://example.test/title",
      territory: "AU",
    },
  ],
};

export const stageRoomOpening: RoomOpening = {
  openingId: stageOpening.id,
  openingNumber: stageOpening.openingNumber,
  title: STAGE_TITLE,
  releaseYear: 2014,
  ownWords: "I understood him. That worried me.",
};

export const stageVoices: RoomVoice[] = [
  ["Maya", "Greatness should not feel this frightening.", "circle"],
  ["Rory", "My shoulders hurt watching that.", "circle"],
  ["Aisha", "Pressure turns talent into something darker.", "circle"],
  ["Dev", "Every victory felt slightly poisoned.", "circle"],
  ["Member 014", "I forgot to breathe near end.", "house"],
  ["Member 021", "Precision becomes its own kind violence.", "house"],
  ["Member 037", "Applause never sounded quite this dangerous.", "house"],
  ["Member 052", "Ambition keeps asking for more blood.", "house"],
].map(([name, body, source], index) => ({
  id: `stage-voice-${index}`,
  body: body as string,
  author_display_name: name as string,
  source: source as RoomVoice["source"],
  created_at: new Date(Date.UTC(2026, 7, 15, 20, index)).toISOString(),
}));

/* ------------------------------------------------------------------ */
/* Trust Us                                                            */
/* ------------------------------------------------------------------ */

export const stageTerritories = ["Ambition", "Longing", "Memory", "Something strange"];

const STAGE_RECORDS = [
  { film_id: "stage-film-1", title: "Territory Film One", release_year: 2001 },
  { film_id: "stage-film-2", title: "Territory Film Two", release_year: 2002 },
  { film_id: "stage-film-3", title: "Territory Film Three", release_year: 2003 },
].map((film, index) => ({
  ...film,
  six_words_before: [
    "One two three four five six",
    "Two three four five six seven",
    "Three four five six seven eight",
  ][index],
}));

const seen = new Set<string>();

/**
 * Stands in for get_trust_us_recommendation() with the same contract:
 * one record or none, never a list, and "Seen it" advances rather than
 * repeating.
 */
export function stageTrustUs(body: {
  territory?: string;
  respondTo?: { filmId: string; response: "seen" | "trusted" };
}) {
  if (body.respondTo) {
    seen.add(body.respondTo.filmId);
    if (body.respondTo.response === "trusted") {
      return { recommendation: null, accepted: true };
    }
  }
  const next = STAGE_RECORDS.find((record) => !seen.has(record.film_id));
  return { recommendation: next ?? null, accepted: false };
}

/* ------------------------------------------------------------------ */
/* Circle — receiving under seal                                       */
/* ------------------------------------------------------------------ */

export const stageRecommendation = {
  id: "00000000-0000-4000-8000-000000000002",
  senderDisplayName: "Maya",
  personalNote: "Watch it before anyone tells you anything about it.",
  runtimeMinutes: 106,
  cues: ["Tempo", "Ambition"],
  revealedAt: null,
};

export const stageSealedProgress = {
  watchState: null,
  hasSkippedReview: false,
  hasSixWords: false,
  sixWordsId: null,
  sixWordsBody: null,
  sixWordsCreatedAt: null,
};

/* ------------------------------------------------------------------ */
/* Library                                                             */
/* ------------------------------------------------------------------ */

export const stageLibrary: LibraryItem[] = [
  {
    kind: "opening",
    target_id: "lib-1",
    opening_number: 7,
    watch_state: "watched",
    watched_at: "2026-08-14T20:00:00.000Z",
    revealed: true,
    title: STAGE_TITLE,
    release_year: 2014,
    six_words: "I understood him. That worried me.",
  },
  {
    kind: "opening",
    target_id: "lib-2",
    opening_number: 6,
    watch_state: "saved",
    watched_at: "2026-08-13T20:00:00.000Z",
    revealed: false,
    title: null,
    release_year: null,
    six_words: null,
  },
  {
    kind: "added",
    target_id: "lib-3",
    opening_number: null,
    watch_state: "watched",
    watched_at: "2026-08-10T20:00:00.000Z",
    revealed: true,
    title: "In the Mood for Love",
    release_year: 2000,
    six_words: null,
  },
  {
    kind: "added",
    target_id: "lib-4",
    opening_number: null,
    watch_state: "watched",
    watched_at: "2026-08-02T20:00:00.000Z",
    revealed: true,
    title: "Burning",
    release_year: 2018,
    six_words: null,
  },
];
