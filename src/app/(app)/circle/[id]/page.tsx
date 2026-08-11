import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { CircleDetail } from "@/components/circle/CircleDetail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your Circle" };

export default async function CircleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: circle } = await supabase.from("circles").select("*").eq("id", id).maybeSingle();
  if (!circle) notFound();

  const [{ data: members }, { data: activity }, { data: screenings }] = await Promise.all([
    supabase.rpc("get_circle_member_names", { p_circle_id: id }),
    supabase.rpc("get_circle_activity", { p_circle_id: id }),
    supabase
      .from("screenings")
      .select("id, scheduled_for, sealed_recommendation_id, opening_id")
      .eq("circle_id", id)
      .order("scheduled_for", { ascending: true }),
  ]);

  let attendance: { screening_id: string; user_id: string; response: string }[] = [];
  if (screenings && screenings.length > 0) {
    const { data } = await supabase
      .from("screening_attendance")
      .select("screening_id, user_id, response")
      .in(
        "screening_id",
        screenings.map((s) => s.id),
      );
    attendance = data ?? [];
  }

  const myRole = (members ?? []).find((m) => m.user_id === user.id)?.role ?? "member";

  return (
    <CircleDetail
      circle={{
        id: circle.id,
        name: circle.name,
        inviteCode: circle.invite_code,
        defaultScreeningDay: circle.default_screening_day,
        defaultScreeningTime: circle.default_screening_time,
      }}
      members={members ?? []}
      activity={activity ?? []}
      screenings={(screenings ?? []).map((s) => ({
        id: s.id,
        scheduledFor: s.scheduled_for,
        hasSealedRecommendation: Boolean(s.sealed_recommendation_id),
        hasOpening: Boolean(s.opening_id),
      }))}
      attendance={attendance}
      currentUserId={user.id}
      myRole={myRole}
    />
  );
}
