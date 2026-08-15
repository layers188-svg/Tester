import styles from "./MemberIdentity.module.css";

export interface MemberRecord {
  /** Openings this member personally opened. */
  nights: number;
  /** Six-word reviews they have published. */
  sixWords: number;
  /** Films they have sent to someone under seal. */
  sent: number;
  /** Films they have added to their own Library. */
  added: number;
}

/**
 * Who the member is in the house.
 *
 * Nothing here is a title and nothing here can become one: these are
 * counts of the member's own rows, and a count carries no film. The
 * page is safe to render before any reveal, which is the reason it can
 * be server rendered at all.
 */
export function MemberIdentity({
  displayName,
  city,
  joinedAt,
  record,
}: {
  displayName: string;
  city: string | null;
  joinedAt: string | null;
  record: MemberRecord;
}) {
  const joined = joinedAt
    ? new Date(joinedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  const entries: Array<[number, string]> = [
    [record.nights, record.nights === 1 ? "Night opened" : "Nights opened"],
    [record.sixWords, "Six words"],
    [record.sent, "Sent under seal"],
    [record.added, "Added yourself"],
  ];

  const nothingYet = entries.every(([count]) => count === 0);

  return (
    <section className={styles.identity} aria-labelledby="hd-identity-name">
      <p className={styles.standing}>
        <span>Founding member</span>
      </p>
      <h1 id="hd-identity-name" className={styles.name}>
        {displayName || "New member"}
      </h1>
      <p className={styles.place}>
        {[city, joined ? `In the house since ${joined}` : null].filter(Boolean).join(" · ") ||
          "In the house"}
      </p>

      {nothingYet ? (
        <p className={styles.first}>
          Your record starts with the first night you open. Nothing counts until you have been
          there.
        </p>
      ) : (
        <dl className={styles.record}>
          {/* The label is the term and the number is its definition, so
              dt comes first in the DOM. The number reads above it,
              which column-reverse handles in CSS rather than by
              inverting the markup into something invalid. */}
          {entries.map(([count, label]) => (
            <div key={label}>
              <dt className={styles.countLabel}>{label}</dt>
              <dd className={styles.count}>{count}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
