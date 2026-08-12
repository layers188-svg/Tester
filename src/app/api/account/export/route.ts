import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

/** Brief §7 "You" rule 7 / §14 rule 9: members can export their personal data. */
export async function POST() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [profile, watches, reviews, emailPreferences, circles, recommendations] = await Promise.all(
    [
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("watches").select("*").eq("user_id", user.id),
      supabase.from("six_word_reviews").select("*").eq("user_id", user.id),
      supabase.from("email_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("circle_members")
        .select("circle_id, role, joined_at, circles(name)")
        .eq("user_id", user.id),
      supabase.rpc("list_my_sealed_recommendations"),
    ],
  );

  // analytics_events is owner-read-only, so the member's own session
  // cannot see it — but the brief §15 events are still their personal
  // data, and /privacy now says we record them. Read through the
  // service role, pinned to this member's own rows. Nothing in them can
  // identify a film (see 0013_analytics.sql).
  const { data: analyticsEvents } = await getServiceSupabase()
    .from("analytics_events")
    .select("event, opening_number, detail, created_at")
    .eq("actor_id", user.id)
    .order("created_at", { ascending: false });

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profile.data,
    circles: circles.data,
    watches: watches.data,
    sixWordReviews: reviews.data,
    emailPreferences: emailPreferences.data,
    sealedRecommendations: recommendations.data,
    usageEvents: analyticsEvents,
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": "attachment; filename=house-dark-export.json",
    },
  });
}
