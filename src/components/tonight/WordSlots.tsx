"use client";

import { useId, useRef } from "react";
import { countWords, SIX_WORD_REQUIRED_COUNT } from "@/lib/validation/six-words";
import styles from "./WordSlots.module.css";

/**
 * Six words, shown as six places to put them.
 *
 * The constraint should be visible before it is explained, so the field
 * is six underlines rather than a box with a counter under it.
 *
 * It is still ONE input, not six.
 *
 * Six separate fields is the obvious build and it is wrong in every
 * detail that matters: pasting a sentence fills only the first, a
 * backspace at the start of a word has nowhere to go, a word you want
 * to split has to be retyped, and assistive technology meets six
 * unlabelled boxes where the member is writing one line. Here a single
 * transparent input sits over the slots and the slots render what it
 * parses, so typing, pasting, selecting and undo all behave the way
 * they do anywhere else, and there is one labelled field to announce.
 */
export function WordSlots({
  value,
  onChange,
  disabled,
  describedBy,
  invalid,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  describedBy?: string;
  invalid?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const words = value.trim().length === 0 ? [] : value.trim().split(/\s+/);

  /**
   * The slot the member is currently in. A trailing space means they
   * have finished a word and moved on, so the caret belongs to the next
   * slot rather than the last one they filled.
   */
  const active = /\s$/.test(value) ? words.length : Math.max(0, words.length - 1);

  function handleChange(next: string) {
    // A hard cap, applied by keeping the first six rather than refusing
    // the edit. Refusing makes a paste of a whole sentence look like a
    // broken field; keeping six shows exactly what was taken.
    if (countWords(next) > SIX_WORD_REQUIRED_COUNT) {
      onChange(next.trim().split(/\s+/).slice(0, SIX_WORD_REQUIRED_COUNT).join(" "));
      return;
    }
    onChange(next);
  }

  return (
    <div className={styles.field} data-disabled={disabled}>
      <label className="hd-visually-hidden" htmlFor={inputId}>
        Your six words
      </label>

      <input
        id={inputId}
        ref={inputRef}
        className={styles.input}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />

      {/*
       * The slots. aria-hidden because they are a second rendering of
       * the input's own value: announcing them would read the member's
       * words back to them a word at a time after the field has already
       * said them.
       */}
      <ol className={styles.slots} aria-hidden="true">
        {Array.from({ length: SIX_WORD_REQUIRED_COUNT }, (_, i) => (
          <li
            key={i}
            className={styles.slot}
            data-filled={Boolean(words[i])}
            data-active={i === active && !disabled}
          >
            <span className={styles.word}>{words[i] ?? ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
