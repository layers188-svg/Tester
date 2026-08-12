import type { Metadata } from "next";
import { getServerSupabase } from "@/lib/supabase/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { ANALYTICS_EVENT_LABEL } from "@/lib/labels";
import styles from "../openings/page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analytics — Programming Desk" };

/**
 * Brief §15. Aggregate counts only — how many times each event happened
 * and how many distinct members it happened to. There is deliberately
 * no per-member trail and no per-film breakdown: the events themselves
 * cannot identify a film, and this page must not become the place where
 * that changes.
 */
export default async function AnalyticsPage() {
  const supabase = await getServerSupabase();
  const { data: rows } = await supabase.rpc("get_analytics_summary", { p_days: 30 });

  const byEvent = new Map((rows ?? []).map((row) => [row.event, row]));
  const total = (rows ?? []).reduce((sum, row) => sum + Number(row.occurrences), 0);

  return (
    <div>
      <h1>Analytics</h1>
      <p>
        The twelve events brief §15 permits, over the last 30 days. First party, stored in this
        project&rsquo;s own database — no third party analytics provider and no cookie. No film
        title, provider link, personal note or review body is ever recorded.
      </p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Event</th>
            <th>Occurrences</th>
            <th>Members</th>
          </tr>
        </thead>
        <tbody>
          {ANALYTICS_EVENTS.map((event) => {
            const row = byEvent.get(event);
            return (
              <tr key={event}>
                <td>{ANALYTICS_EVENT_LABEL[event]}</td>
                <td>{row ? Number(row.occurrences) : 0}</td>
                <td>{row ? Number(row.members) : 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {total === 0 && (
        <p>Nothing recorded yet. Events start arriving once members sign in and an opening runs.</p>
      )}
    </div>
  );
}
