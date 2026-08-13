import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { YouForm } from "@/components/you/YouForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Me" };

export default async function YouPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: emailPreferences }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("email_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("circle_members").select("circles(id, name)").eq("user_id", user.id),
  ]);

  const circles = (memberships ?? [])
    .map((m) => m.circles as unknown as { id: string; name: string } | null)
    .filter((c): c is { id: string; name: string } => Boolean(c));

  return (
    <div className={styles.page}>
      <h1>Me</h1>
      <YouForm
        email={user.email ?? ""}
        profile={{
          displayName: profile?.display_name ?? "",
          city: profile?.city ?? "",
          timezone: profile?.timezone ?? "UTC",
          marketingConsent: Boolean(profile?.marketing_consent_at),
        }}
        emailPreferences={{
          nightlyOpening: emailPreferences?.nightly_opening ?? true,
          sealedRecommendations: emailPreferences?.sealed_recommendations ?? true,
          screeningReminders: emailPreferences?.screening_reminders ?? true,
          afterCredits: emailPreferences?.after_credits ?? true,
          editorialEdm: emailPreferences?.editorial_edm ?? false,
        }}
        circles={circles}
      />
    </div>
  );
}
