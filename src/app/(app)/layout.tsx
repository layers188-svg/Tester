import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AppNav } from "@/components/AppNav";
import styles from "./layout.module.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/join");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className={styles.shell}>
      <main id="hd-main" className={styles.main}>
        {children}
      </main>
      <AppNav isOwner={profile?.role === "owner"} />
    </div>
  );
}
