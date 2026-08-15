import type { Metadata } from "next";
import { JoinForm } from "./JoinForm";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Join or sign in",
  description: "Sign in to House Dark with a six digit email code. No password.",
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /**
   * The testing bypass key, read here rather than in the client.
   *
   * Reading it from `window.location.search` inside an effect meant the
   * server rendered the ordinary form and the client then swapped in the
   * bypass — a state update in an effect, and a hydration mismatch on
   * exactly the control that signs someone in. Server-side, both renders
   * agree. The value is only ever what the visitor put in the URL; the
   * real check is in /api/test-signin against TEST_SIGNIN_KEY.
   */
  const params = await searchParams;
  const raw = params.k;
  const testKey = typeof raw === "string" && raw.length > 0 ? raw : null;

  return (
    <div className={styles.page}>
      <h1>Join or sign in</h1>
      <p className={styles.lead}>
        No password. We email a six digit code, you enter it here, that&rsquo;s it.
      </p>
      <JoinForm testKey={testKey} />
    </div>
  );
}
