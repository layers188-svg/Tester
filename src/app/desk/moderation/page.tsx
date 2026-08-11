import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { ModerationList } from "@/components/desk/ModerationList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Moderation — Programming Desk" };

export default async function ModerationPage() {
  const supabase = await getServerSupabase();
  const { data: reviews } = await supabase
    .from("six_word_reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1>Moderation</h1>
      <p>
        Hide or remove spoiler-unsafe or abusive reviews. Curate approved ones for the public site.
      </p>
      <ModerationList reviews={reviews ?? []} />
    </div>
  );
}
