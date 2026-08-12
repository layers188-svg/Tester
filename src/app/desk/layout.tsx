import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import styles from "./layout.module.css";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/join?next=/desk");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "owner") redirect("/tonight");

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/desk" className={styles.brand}>
          Programming Desk
        </Link>
        <Link href="/tonight" className={styles.exit}>
          Back to House Dark
        </Link>
      </header>
      <nav className={styles.nav} aria-label="Programming Desk">
        <Link href="/desk/openings">Openings</Link>
        <Link href="/desk/moderation">Moderation</Link>
        <Link href="/desk/emails">Email queue</Link>
        <Link href="/desk/analytics">Analytics</Link>
        <Link href="/desk/audit">Audit log</Link>
      </nav>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
