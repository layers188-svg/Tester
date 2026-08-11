import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import styles from "../openings/page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email queue — Programming Desk" };

export default async function EmailQueuePage() {
  const supabase = await getServerSupabase();
  const { data: rows } = await supabase
    .from("notification_queue")
    .select("id, type, status, attempts, send_at, last_error")
    .order("send_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1>Email queue</h1>
      <p>Delivery state for operational email. No title or address content is ever logged here.</p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Type</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Send at</th>
            <th>Last error</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((row) => (
            <tr key={row.id}>
              <td>{row.type}</td>
              <td className={styles.status} data-status={row.status}>
                {row.status}
              </td>
              <td>{row.attempts}</td>
              <td>{new Date(row.send_at).toLocaleString()}</td>
              <td>{row.last_error ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(rows ?? []).length === 0 && <p>Nothing queued yet.</p>}
    </div>
  );
}
