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

function findInString(value: string, forbidden: string[], path: string): LeakMatch[] {
  const matches: LeakMatch[] = [];
  const lowerValue = value.toLowerCase();
  for (const term of forbidden) {
    if (term.length === 0) continue;
    const lowerTerm = term.toLowerCase();
    let index = lowerValue.indexOf(lowerTerm);
    while (index !== -1) {
      matches.push({ path, forbidden: term, excerpt: excerptAround(value, index, term.length) });
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
  path = "$",
  seen: WeakSet<object> = new WeakSet(),
): LeakMatch[] {
  if (value == null) return [];

  if (typeof value === "string") {
    return findInString(value, forbidden, path);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findTitleLeaks(item, forbidden, `${path}[${index}]`, seen));
  }

  if (value instanceof Map) {
    return Array.from(value.entries()).flatMap(([key, item]) =>
      findTitleLeaks(item, forbidden, `${path}.${String(key)}`, seen),
    );
  }

  if (value instanceof Set) {
    return Array.from(value.values()).flatMap((item, index) =>
      findTitleLeaks(item, forbidden, `${path}[${index}]`, seen),
    );
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return [];
    seen.add(obj);
    return Object.entries(obj).flatMap(([key, item]) =>
      findTitleLeaks(item, forbidden, `${path}.${key}`, seen),
    );
  }

  return [];
}

export function assertNoTitleLeak(value: unknown, forbidden: string[], context: string): void {
  const leaks = findTitleLeaks(value, forbidden);
  if (leaks.length > 0) {
    const summary = leaks
      .slice(0, 5)
      .map((leak) => `  ${leak.path}: "${leak.excerpt}"`)
      .join("\n");
    throw new Error(`Title leak detected in ${context}:\n${summary}`);
  }
}
