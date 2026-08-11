import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import styles from "../openings/page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Audit log — Programming Desk" };

export default async function AuditLogPage() {
  const supabase = await getServerSupabase();
  const { data: rows } = await supabase
    .from("audit_log")
    .select("id, action, target_type, safe_metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1>Audit log</h1>
      <p>
        Administrative actions only. Never a film title, provider URL or other secret (brief §10).
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>When</th>
            <th>Action</th>
            <th>Target</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((row) => (
            <tr key={row.id}>
              <td>{new Date(row.created_at).toLocaleString()}</td>
              <td>{row.action}</td>
              <td>{row.target_type}</td>
              <td>{JSON.stringify(row.safe_metadata)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(rows ?? []).length === 0 && <p>No activity recorded yet.</p>}
    </div>
  );
}
