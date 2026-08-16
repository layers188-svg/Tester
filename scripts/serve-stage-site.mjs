import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

/**
 * Serves stage-site/out the way GitHub Pages serves it.
 *
 * The published build carries a base path (`/Tester`), so the bytes are
 * only exercised honestly if that prefix is served. But Playwright's
 * baseURL cannot carry a path — an absolute goto() replaces it — so this
 * answers on both the prefix and the root, from the same files. That
 * lets tests/e2e/motion.spec.ts run unchanged against exactly what is
 * published, rather than against a second build made to suit the test.
 *
 *   node scripts/serve-stage-site.mjs [port]
 *
 * A review server, not a production one: it serves a fixed directory,
 * resolves every path inside it, and does nothing else.
 */

const ROOT = resolve(import.meta.dirname, "..", "stage-site", "out");
const PORT = Number(process.argv[2] ?? 4173);
const BASE_PATH = process.env.BASE_PATH ?? "/Tester";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/** The file for a request path, or null if it escapes the export. */
async function resolveFile(pathname) {
  let rel = decodeURIComponent(pathname);
  if (BASE_PATH && (rel === BASE_PATH || rel.startsWith(`${BASE_PATH}/`))) {
    rel = rel.slice(BASE_PATH.length) || "/";
  }

  const candidates = extname(rel)
    ? [rel]
    : [join(rel, "index.html"), `${rel.replace(/\/$/, "")}.html`];

  for (const candidate of candidates) {
    const full = resolve(join(ROOT, normalize(candidate)));
    if (!full.startsWith(ROOT)) return null;
    try {
      if ((await stat(full)).isFile()) return full;
    } catch {
      // Try the next shape.
    }
  }
  return null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
  const file = (await resolveFile(pathname)) ?? (await resolveFile("/404.html"));

  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
    return;
  }

  res.writeHead(pathname === "/404.html" ? 404 : 200, {
    "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  res.end(await readFile(file));
}).listen(PORT, () => {
  console.log(`stage-site/out on http://localhost:${PORT}${BASE_PATH}/ (and at /)`);
});
