import type { NextConfig } from "next";

/**
 * The motion review site.
 *
 * `/dev/stage` needs no server: it mounts the real components with
 * fixture props and stubs `window.fetch`, so everything the signature
 * motion touches is client side. That makes it exportable as flat files,
 * which is the difference between a review link that costs nothing and
 * one that needs a paid Workers plan — a server rendered Next.js app is
 * ~2 MiB of Worker script however it is built, and the Cloudflare free
 * limit is 1 MiB.
 *
 * This is a second, deliberately tiny app rather than a flag on the main
 * one because `output: "export"` is all-or-nothing: it would also try to
 * export /api/* and every force-dynamic signed-in route, which cannot be
 * static and must not be. Nothing is copied — the pages here import the
 * real components from ../src through the same `@/*` alias.
 *
 * BASE_PATH exists because GitHub Pages serves a project site from a
 * subdirectory. Set it to the repository name to publish there, leave it
 * unset to build a site rooted at /.
 */

const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // Consumed by noTrailerUrl(); Next prefixes its own asset URLs, but
  // not a path held in ordinary data such as a Library record's.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // GitHub Pages resolves /dev/stage to /dev/stage/index.html only when
  // the export writes directories rather than dev/stage.html.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
