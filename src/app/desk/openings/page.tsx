import type { Metadata } from "next";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { listDeskOpenings } from "@/lib/desk/queries";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Openings — Programming Desk" };

export default async function DeskOpeningsPage() {
  const supabase = await getServerSupabase();
  const openings = await listDeskOpenings(supabase);

  return (
    <div>
      <div className={styles.head}>
        <h1>Openings</h1>
        <Link href="/desk/openings/new" className={styles.newLink}>
          + New opening
        </Link>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Film</th>
            <th>Status</th>
            <th>Opens</th>
            <th>Approved</th>
          </tr>
        </thead>
        <tbody>
          {openings.map((o) => (
            <tr key={o.id}>
              <td>
                <Link href={`/desk/openings/${o.id}`}>{o.openingNumber}</Link>
              </td>
              <td>{o.filmTitle ?? "—"}</td>
              <td className={styles.status} data-status={o.status}>
                {o.status}
              </td>
              <td>
                {new Date(o.opensAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </td>
              <td>{o.approved ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {openings.length === 0 && <p>No openings yet.</p>}
    </div>
  );
}
