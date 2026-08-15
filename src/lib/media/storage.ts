/**
 * Public URL for an object in the No Trailer bucket.
 *
 * `path` is the object *name* — an opaque identifier written by the
 * Programming Desk's generateStorageName(), never a descriptive
 * filename (brief §12, and the note in tests/e2e/fixtures/README.md
 * about why a filename counts as a place a title can surface).
 *
 * A value that is already a URL or an absolute path is returned
 * untouched. That covers a No Trailer served from somewhere other than
 * the project's own Storage bucket — a CDN in front of it, or the
 * staging simulator's local clip — without each caller having to work
 * out which kind of value it is holding.
 */
export function noTrailerUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) {
    return path;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/no-trailer/${path}`;
}
