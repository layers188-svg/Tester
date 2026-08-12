/**
 * Title leak detector (brief §11 rule 9, §17 "Spoiler regression test").
 *
 * Deep-scans arbitrary values — HTML strings, parsed JSON, email
 * payloads, log lines, accessibility label trees — for any forbidden
 * string (typically a film title). Used by the automated spoiler
 * regression suite and importable anywhere a value needs a runtime
 * assertion before it leaves the server.
 */

export interface LeakMatch {
  path: string;
  forbidden: string;
  excerpt: string;
}

function excerptAround(haystack: string, index: number, needleLength: number): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(haystack.length, index + needleLength + 20);
  return haystack.slice(start, end);
}

export interface LeakScanOptions {
  /**
   * Require the term to sit on word boundaries rather than matching any
   * substring. Off by default: when scanning rendered output the scan
   * should over-trigger. Turn it on when scanning dynamic *data*, where
   * a term embedded in a longer word is noise rather than signal — see
   * `assertSafeEmailData`.
   */
  wholeWord?: boolean;
}

/** Letters, digits and underscore are "inside a word"; everything else is a boundary. */
function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}_]/u.test(char);
}

function findInString(
  value: string,
  forbidden: string[],
  path: string,
  options: LeakScanOptions,
): LeakMatch[] {
  const matches: LeakMatch[] = [];
  const lowerValue = value.toLowerCase();
  for (const term of forbidden) {
    if (term.length === 0) continue;
    const lowerTerm = term.toLowerCase();
    let index = lowerValue.indexOf(lowerTerm);
    while (index !== -1) {
      const before = value[index - 1];
      const after = value[index + term.length];
      const onBoundary = !isWordChar(before) && !isWordChar(after);
      if (!options.wholeWord || onBoundary) {
        matches.push({ path, forbidden: term, excerpt: excerptAround(value, index, term.length) });
      }
      index = lowerValue.indexOf(lowerTerm, index + 1);
    }
  }
  return matches;
}

/**
 * Recursively scans strings, arrays, objects (including Map/Set) for
 * any of the forbidden terms. Case-insensitive, substring match — a
 * spoiler leak detector should over-trigger, never under-trigger.
 */
export function findTitleLeaks(
  value: unknown,
  forbidden: string[],
  options: LeakScanOptions = {},
): LeakMatch[] {
  const seen = new WeakSet<object>();

  function walk(item: unknown, path: string): LeakMatch[] {
    if (item == null) return [];

    if (typeof item === "string") {
      return findInString(item, forbidden, path, options);
    }

    if (typeof item === "number" || typeof item === "boolean") {
      return [];
    }

    if (Array.isArray(item)) {
      return item.flatMap((entry, index) => walk(entry, `${path}[${index}]`));
    }

    if (item instanceof Map) {
      return Array.from(item.entries()).flatMap(([key, entry]) =>
        walk(entry, `${path}.${String(key)}`),
      );
    }

    if (item instanceof Set) {
      return Array.from(item.values()).flatMap((entry, index) => walk(entry, `${path}[${index}]`));
    }

    if (typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if (seen.has(obj)) return [];
      seen.add(obj);
      return Object.entries(obj).flatMap(([key, entry]) => walk(entry, `${path}.${key}`));
    }

    return [];
  }

  return walk(value, "$");
}

export function assertNoTitleLeak(
  value: unknown,
  forbidden: string[],
  context: string,
  options: LeakScanOptions = {},
): void {
  const leaks = findTitleLeaks(value, forbidden, options);
  if (leaks.length > 0) {
    const summary = leaks
      .slice(0, 5)
      .map((leak) => `  ${leak.path}: "${leak.excerpt}"`)
      .join("\n");
    throw new Error(`Title leak detected in ${context}:\n${summary}`);
  }
}
