import "server-only";

import { countWords } from "@/lib/validation/six-words";
import type { FilmEditorial, FilmFacts } from "./types";

/**
 * The instruction the editorial engine works to.
 *
 * Kept here, on the server, and never sent to the browser. It is the
 * product's editorial voice written down, and it is also the only thing
 * standing between a member and a spoiler, so it says what not to do at
 * more length than what to do.
 */
const SYSTEM_PROMPT = `You are the editorial engine for House Dark, a film product built around discovering films without spoilers.

Given factual metadata about a film, write an EXACTLY SIX WORD description.

Describe only the film's initial human situation, its broad central tension, or its thematic territory.

Never reveal: plot developments, twists, deaths, endings, relationship outcomes, hidden identities, secret motivations, mystery solutions, concealed antagonists, or anything not reasonably apparent from the first ten to fifteen minutes.

Use plain, evocative language. Do not review the film. Do not say whether it is good. Do not tell the viewer how to feel. No promotional language. Do not mention actors. No ratings. Do not include the film's title in the six words unless unavoidable.

When uncertain, reveal less.

Also return exactly three spoiler-safe territory words, one broad pace descriptor, and one broad intensity descriptor.

Respond with JSON only, in this shape:
{"sixWordPlot":"...","territory":["...","...","..."],"pace":"...","intensity":"..."}`;

export class EditorialUnavailableError extends Error {
  constructor(message = "No editorial engine is configured.") {
    super(message);
    this.name = "EditorialUnavailableError";
  }
}

export class EditorialInvalidError extends Error {
  constructor(message = "The editorial engine did not return six words.") {
    super(message);
    this.name = "EditorialInvalidError";
  }
}

/**
 * Exactly six words, checked rather than requested.
 *
 * The model is told six and will still sometimes return five or seven,
 * so its answer is counted here before anything else happens to it.
 * `countWords` is the same function the member-facing six-word review
 * uses, so "six words" means one thing across the whole product.
 *
 * Trailing punctuation is left alone. "Drummer chases greatness under
 * brutal mentorship." is six words with a full stop, and stripping it
 * would make the house's sentences read as fragments next to a
 * member's.
 */
export function validateEditorial(value: unknown): FilmEditorial {
  if (typeof value !== "object" || value === null) {
    throw new EditorialInvalidError("The editorial engine returned nothing usable.");
  }

  const raw = value as Record<string, unknown>;
  const plot =
    typeof raw.sixWordPlot === "string" ? raw.sixWordPlot.trim().replace(/\s+/g, " ") : "";

  if (countWords(plot) !== 6) {
    throw new EditorialInvalidError(`Expected six words, counted ${countWords(plot)}.`);
  }

  const territory = Array.isArray(raw.territory)
    ? raw.territory
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const single = (input: unknown): string | null => {
    if (typeof input !== "string") return null;
    const trimmed = input.trim();
    // One word. A pace of "quite slow at first but then quick" is not a
    // descriptor, it is a review.
    return trimmed && countWords(trimmed) === 1 ? trimmed : null;
  };

  return {
    sixWordPlot: plot,
    territory,
    pace: single(raw.pace),
    intensity: single(raw.intensity),
  };
}

/** Strips the ```json fences a model adds when asked for JSON. */
function parseModelJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(body);
  } catch {
    throw new EditorialInvalidError("The editorial engine did not return JSON.");
  }
}

/**
 * Ask the model for the House Dark version of a film.
 *
 * Retries once on an invalid answer rather than accepting it. A wrong
 * word count is the model's most common failure and it is entirely
 * recoverable, but a second failure is reported rather than papered
 * over: a five-word premise padded out by code would be House Dark
 * publishing something no one wrote.
 */
export async function generateEditorial(
  facts: FilmFacts,
  signal?: AbortSignal,
): Promise<FilmEditorial> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new EditorialUnavailableError();

  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5";

  const factSheet = [
    `Title: ${facts.title}`,
    facts.releaseYear ? `Year: ${facts.releaseYear}` : null,
    facts.runtimeMinutes ? `Runtime: ${facts.runtimeMinutes} minutes` : null,
    facts.genres.length ? `Genres: ${facts.genres.join(", ")}` : null,
    facts.synopsis ? `Reference synopsis (do not reuse its wording): ${facts.synopsis}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content:
              attempt === 0
                ? factSheet
                : `${factSheet}\n\nYour previous answer did not contain exactly six words. Count them and return exactly six.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      // The provider's own error text can carry account and key detail.
      // It never travels further than this line.
      throw new EditorialUnavailableError(`The editorial engine responded ${response.status}.`);
    }

    const payload = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text = (payload.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("");

    try {
      return validateEditorial(parseModelJson(text));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new EditorialInvalidError();
}

export { SYSTEM_PROMPT as EDITORIAL_SYSTEM_PROMPT };
