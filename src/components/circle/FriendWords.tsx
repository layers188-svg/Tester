import Link from "next/link";
import type { CircleSixWords } from "@/lib/supabase/types";
import styles from "./FriendWords.module.css";

/**
 * What the people you share a Circle with have said, and what is still
 * sealed.
 *
 * The seal is the point of the section, not an obstacle to it: a member
 * should be able to see that a friend has reacted to a film without
 * that costing them their own first reaction. So a sealed row still
 * says who spoke and about which night, and only the words are held
 * back.
 *
 * Nothing here decides anything. `body` and `title` arrive already null
 * when they must be withheld (migration 0019), so this cannot leak by
 * forgetting a condition.
 */
export function FriendWords({ words }: { words: CircleSixWords[] }) {
  if (words.length === 0) {
    return (
      <p className={styles.empty}>
        Nothing from your Circle yet. When someone you share a Circle with leaves six words, they
        appear here.
      </p>
    );
  }

  return (
    <ul className={styles.list}>
      {words.map((word) => (
        <li key={word.review_id} className={styles.row} data-unlocked={word.unlocked}>
          <p className={styles.film}>
            {word.title ?? `Opening ${word.opening_number}`}
            {!word.title && <span className={styles.sealedTag}>Sealed</span>}
          </p>

          {word.unlocked && word.body ? (
            <p className={styles.words}>{word.body}</p>
          ) : (
            <p className={styles.locked}>
              {word.actor_display_name} left six words after this film. They open when you have
              watched it.
            </p>
          )}

          {word.unlocked && word.body && <p className={styles.who}>{word.actor_display_name}</p>}

          {!word.unlocked && (
            <Link href="/tonight" className={styles.link}>
              Go to tonight
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
