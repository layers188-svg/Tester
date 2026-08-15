import type { OpeningSafe, MemberOpeningProgress } from "@/lib/opening/queries";
import type { RoomOpening } from "@/lib/room/queries";
import type { RoomVoice } from "@/lib/supabase/types";

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
