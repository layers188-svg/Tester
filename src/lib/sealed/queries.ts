import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, WatchState } from "@/lib/supabase/types";

export interface SealedProgress {
  watchState: WatchState | null;
  hasSixWords: boolean;
  sixWordsId: string | null;
  sixWordsBody: string | null;
  sixWordsCreatedAt: string | null;
}

export async function getMemberSealedProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
  recommendationId: string,
): Promise<SealedProgress> {
  const [{ data: watch }, { data: review }] = await Promise.all([
    supabase
      .from("watches")
      .select("state")
      .eq("user_id", userId)
      .eq("sealed_recommendation_id", recommendationId)
      .maybeSingle(),
    supabase
      .from("six_word_reviews")
      .select("id, body, created_at")
      .eq("user_id", userId)
      .eq("sealed_recommendation_id", recommendationId)
      .maybeSingle(),
  ]);

  return {
    watchState: watch?.state ?? null,
    hasSixWords: Boolean(review),
    sixWordsId: review?.id ?? null,
    sixWordsBody: review?.body ?? null,
    sixWordsCreatedAt: review?.created_at ?? null,
  };
}
