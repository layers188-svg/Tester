import type { RevealResult } from "@/lib/supabase/types";

/**
 * The wire shape of a successful reveal — the only payload in the
 * product that is allowed to carry a title, and only ever as the
 * response to a POST on `/api/reveal/*` (brief §11).
 *
 * The reveal RPCs return snake_case (`RevealResult`); the browser reads
 * camelCase. That rename is the one difference, so the field types are
 * derived from `RevealResult` rather than restated — a change to the
 * RPC's provider shape now fails to compile at the routes and the two
 * components that consume them, instead of silently widening to
 * `string` in a hand-copied interface.
 */
export interface RevealPayload {
  title: RevealResult["title"];
  releaseYear: RevealResult["release_year"];
  providers: RevealResult["providers"];
}

/**
 * `providers` needs no null guard here: both reveal RPCs wrap the
 * `jsonb_agg` in `coalesce(..., '[]'::jsonb)` (0004_reveal.sql), so a
 * film with no verified destination returns an empty array rather than
 * null. The components render `providers.length === 0` as "no verified
 * playback destination on record", which is that case.
 */
export function toRevealPayload(result: RevealResult): RevealPayload {
  return {
    title: result.title,
    releaseYear: result.release_year,
    providers: result.providers,
  };
}
