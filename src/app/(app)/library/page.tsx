import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { LibraryTabs } from "@/components/library/LibraryTabs";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Library" };

export default async function LibraryPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: mine }, { data: circleActivity }, { data: house }, { data: entries }] =
    await Promise.all([
      supabase.rpc("get_my_library"),
      supabase.rpc("get_my_circles_activity"),
      supabase.rpc("get_house_openings"),
      // The member's own additions. RLS restricts this to their rows,
      // so no user filter is needed and adding one would imply the
      // policy is not trusted.
      supabase
        .from("library_entries")
        .select("id, title, release_year, runtime_minutes, state, six_words, created_at")
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className={styles.page}>
      <h1>Library</h1>
      <p className={styles.lead}>
        Your collection. What the house programmed, and whatever else you have watched.
      </p>
      <LibraryTabs
        mine={mine ?? []}
        circleActivity={circleActivity ?? []}
        house={house ?? []}
        entries={entries ?? []}
      />
    </div>
  );
}
