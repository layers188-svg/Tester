/**
 * Public URL for an object in the No Trailer bucket.
 *
 * `path` is the object *name* — an opaque identifier written by the
 * Programming Desk's generateStorageName(), never a descriptive
 * filename (brief §12, and the note in tests/e2e/fixtures/README.md
 * about why a filename counts as a place a title can surface).
 *
 * A value that is already a URL is returned untouched. That covers a No
 * Trailer served from somewhere other than the project's own Storage
 * bucket — a CDN in front of it — without each caller having to work out
 * which kind of value it is holding.
 *
 * An absolute path is a file this deployment serves itself (the staging
 * simulator's local clip), so it takes the deployment's base path. Next
 * prefixes its own asset URLs but not a path carried in ordinary data,
 * and the motion review site is published to a subdirectory. Unset
 * everywhere else, where the prefix is "" and this is the identity.
 */
export function noTrailerUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/no-trailer/${path}`;
}
