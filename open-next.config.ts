import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cloudflare Workers deployment (brief §9 item 7). Deliberately
 * minimal: House Dark must never cache a page or API response that
 * could carry a film title, so no incremental cache, tag cache or
 * queue is configured here. Every signed-in route is already
 * force-dynamic; leave it that way.
 */
export default defineCloudflareConfig();
