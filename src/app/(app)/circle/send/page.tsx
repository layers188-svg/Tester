import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { SendForm } from "@/components/circle/SendForm";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Send under seal" };

export default async function SendPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /**
   * Prefill from a Library row, so "Send under seal" on a film the
   * member has revealed arrives with the film already filled in rather
   * than asking them to retype what the house already knows.
   *
   * Read as plain query text and passed to the form as a starting
   * value. Nothing is trusted: what is actually sent goes through the
   * same validation as a typed send.
   */
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const prefill = {
    title: one(params.title).slice(0, 200),
    releaseYear: one(params.year).replace(/\D/g, "").slice(0, 4),
    runtimeMinutes: one(params.runtime).replace(/\D/g, "").slice(0, 4),
  };

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("circle_members")
    .select("circles(id, name)")
    .eq("user_id", user.id);

  const circles = (memberships ?? [])
    .map((m) => m.circles as unknown as { id: string; name: string } | null)
    .filter((c): c is { id: string; name: string } => Boolean(c));

  const recipientMap = new Map<
    string,
    { userId: string; displayName: string; circleNames: string[] }
  >();

  for (const circle of circles) {
    const { data: members } = await supabase.rpc("get_circle_member_names", {
      p_circle_id: circle.id,
    });
    for (const member of members ?? []) {
      if (member.user_id === user.id) continue;
      const existing = recipientMap.get(member.user_id);
      if (existing) {
        existing.circleNames.push(circle.name);
      } else {
        recipientMap.set(member.user_id, {
          userId: member.user_id,
          displayName: member.display_name,
          circleNames: [circle.name],
        });
      }
    }
  }

  return (
    <div className={styles.page}>
      <h1>Send under seal</h1>
      <p className={styles.lead}>
        They will see your note and up to three cues. Never the title, never a poster.
      </p>
      <SendForm
        recipients={Array.from(recipientMap.values())}
        circles={circles}
        prefill={prefill}
      />
    </div>
  );
}
