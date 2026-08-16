import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Copies the files the review site serves out of the product's public/.
 *
 * Kept as a build step rather than a second checked-in copy so the two
 * cannot drift. The stage's clip is the one thing here, and if it were
 * duplicated in git, replacing it would silently leave the published
 * site playing the old one — which is precisely the failure the motion
 * suite cannot catch, because both files would be valid video.
 */

const ROOT = resolve(import.meta.dirname, "..");
const TARGET = join(ROOT, "stage-site", "public");

rmSync(TARGET, { recursive: true, force: true });
mkdirSync(TARGET, { recursive: true });

// Just dev/: the review site has no manifest, icons or service worker,
// and shipping a manifest that names routes this export does not have
// would be worse than shipping none.
cpSync(join(ROOT, "public", "dev"), join(TARGET, "dev"), { recursive: true });
