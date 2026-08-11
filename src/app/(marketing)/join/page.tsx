import type { Metadata } from "next";
import { JoinForm } from "./JoinForm";
import styles from "../content.module.css";

export const metadata: Metadata = {
  title: "Join or sign in",
  description: "Sign in to House Dark with a six digit email code. No password.",
};

export default function JoinPage() {
  return (
    <div className={styles.page}>
      <h1>Join or sign in</h1>
      <p className={styles.lead}>
        No password. We email a six digit code, you enter it here, that&rsquo;s it.
      </p>
      <JoinForm />
    </div>
  );
}
