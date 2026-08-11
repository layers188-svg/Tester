import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getMemberSealedProgress } from "@/lib/sealed/queries";
import { SealedExperience } from "@/components/circle/SealedExperience";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sent under seal" };

export default async function SealedRecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("get_sealed_recommendation_safe", {
    p_recommendation_id: id,
  });

  if (error || !data || data.length === 0) notFound();
  const safe = data[0];
  const progress = await getMemberSealedProgress(supabase, user.id, id);

  return (
    <SealedExperience
      recommendation={{
        id: safe.id,
        senderDisplayName: safe.sender_display_name,
        personalNote: safe.personal_note,
        runtimeMinutes: safe.runtime_minutes,
        cues: safe.cues,
        revealedAt: safe.revealed_at,
      }}
      progress={progress}
    />
  );
}
