import Link from "next/link";
import type { CircleSixWords } from "@/lib/supabase/types";
import { SealMark } from "./SealMark";
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
      {words.map((word, index) => (
        <li
          key={word.review_id}
          className={`${styles.row} hd-stage`}
          data-unlocked={word.unlocked}
          // Capped: past the sixth row the stagger is only delay, and a
          // long Circle would leave the last rows arriving seconds late.
          style={{ "--hd-stage-index": Math.min(index, 6) } as React.CSSProperties}
        >
          <p className={styles.film}>
            {/* The same seal as a sealed recommendation, in the same two
                states. Six words a member cannot read yet are held back
                by the same object that holds back a film. */}
            <SealMark broken={word.unlocked} className={styles.seal} />
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
