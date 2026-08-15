import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AppNav } from "@/components/AppNav";
import { MotionPreferenceProvider } from "@/lib/motion/reduced-motion";
import styles from "./layout.module.css";

/**
 * The authentication gate for every signed-in route. `redirect()` throws
 * before any child page renders, so no page under (app) can leak data to
 * an anonymous visitor even if it forgets its own check. Row Level
 * Security is still the real boundary underneath — this is the layer
 * that produces a good redirect instead of an empty screen.
 *
 * There is deliberately no proxy/middleware file: Next 16 pins Proxy to
 * the Node.js runtime, which the Cloudflare adapter cannot build, and
 * the brief requires a Cloudflare deployment (§9 item 7). A Server
 * Component cannot see the request pathname, so the redirect cannot
 * carry a `?next=`; JoinForm falls back to /tonight.
 */
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
    <MotionPreferenceProvider>
      <div className={styles.shell}>
        <main id="hd-main" className={styles.main}>
          {children}
        </main>
        <AppNav isOwner={profile?.role === "owner"} />
      </div>
    </MotionPreferenceProvider>
  );
}
