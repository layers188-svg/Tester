import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { MemberIdentity } from "@/components/you/MemberIdentity";
import { YouForm } from "@/components/you/YouForm";
import identityStyles from "@/components/you/MemberIdentity.module.css";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Me" };

export default async function YouPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  /*
   * The member's record. Four counts, each of the member's own rows and
   * each already readable to them under RLS (0003: reveals_select_own,
   * six_word_reviews_select, sealed_recommendations_select_sender,
   * 0018: library_entries_select_own), so this needs no new function
   * and no new policy.
   *
   * `head: true` asks for the count and none of the rows. That is worth
   * doing carefully here rather than by habit: fetching the rows to
   * measure their length would pull revealed titles into a page that
   * has no business holding any.
   */
  const [
    { data: profile },
    { data: emailPreferences },
    { data: memberships },
    { count: nights },
    { count: sixWords },
    { count: sent },
    { count: added },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("email_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("circle_members").select("circles(id, name)").eq("user_id", user.id),
    supabase.from("reveals").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("six_word_reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("moderation_state", "visible"),
    supabase
      .from("sealed_recommendations")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", user.id),
    supabase
      .from("library_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const circles = (memberships ?? [])
    .map((m) => m.circles as unknown as { id: string; name: string } | null)
    .filter((c): c is { id: string; name: string } => Boolean(c));

  return (
    <div className={styles.page}>
      <MemberIdentity
        displayName={profile?.display_name ?? ""}
        city={profile?.city ?? null}
        joinedAt={profile?.created_at ?? null}
        record={{
          nights: nights ?? 0,
          sixWords: sixWords ?? 0,
          sent: sent ?? 0,
          added: added ?? 0,
        }}
      />

      {/*
        A labelled region rather than a heading. YouForm's own sections
        are already h2s, so an h2 here would make Profile and Email
        siblings of Settings instead of the things inside it. The
        visible word is a divider; the region is what assistive tech
        navigates by.
      */}
      <section aria-label="Settings">
        <p className={identityStyles.settingsHead}>
          <span>Settings</span>
        </p>

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
      </section>
    </div>
  );
}
