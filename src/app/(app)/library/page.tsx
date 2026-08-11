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

  const [{ data: mine }, { data: circleActivity }, { data: house }] = await Promise.all([
    supabase.rpc("get_my_library"),
    supabase.rpc("get_my_circles_activity"),
    supabase.rpc("get_house_openings"),
  ]);

  return (
    <div className={styles.page}>
      <h1>Library</h1>
      <p className={styles.lead}>Chronological. Private by default. No poster wall, no ranking.</p>
      <LibraryTabs mine={mine ?? []} circleActivity={circleActivity ?? []} house={house ?? []} />
    </div>
  );
}
