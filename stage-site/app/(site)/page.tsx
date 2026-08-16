/**
 * The House behind the aperture.
 *
 * The real page, imported. It reads approved six words from Supabase and
 * falls back to its own clearly-marked demonstration set when there is
 * no project to read from — which is the case here, so the export is
 * built from the fallback. No `revalidate` comes with it: that export
 * belongs to the route module, and an exported site has nothing to
 * revalidate against.
 */
export { default } from "@/app/(marketing)/page";
