/**
 * House Dark scheduled trigger.
 *
 * A deliberately tiny, separate Cloudflare Worker. The main app is
 * deployed through the OpenNext adapter, whose worker only exports a
 * fetch handler — so the Cron Trigger lives here instead and simply
 * calls the app's own POST /api/cron endpoint (see
 * src/app/api/cron/route.ts), which does all the real work.
 *
 * Deploy separately:
 *   cd workers/cron
 *   npx wrangler secret put CRON_SECRET
 *   npx wrangler secret put APP_URL
 *   npx wrangler deploy
 */

interface Env {
  APP_URL: string;
  CRON_SECRET: string;
}

/**
 * Minimal local shapes for the two Workers runtime types this file
 * touches. Declared here rather than pulling in
 * @cloudflare/workers-types, which would add a dependency to the whole
 * repo for one 50-line worker.
 */
interface ScheduledController {
  readonly scheduledTime: number;
  readonly cron: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const worker = {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runCron(env));
  },

  /**
   * Manual trigger for debugging, guarded by the same secret. Useful
   * when checking that the schedule reaches the app at all.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const provided = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (provided !== env.CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    const result = await runCron(env);
    return Response.json(result);
  },
};

export default worker;

async function runCron(env: Env): Promise<{ ok: boolean; status: number; body?: string }> {
  const response = await fetch(`${env.APP_URL}/api/cron`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  // Never log the body on success — it is a safe report, but there is
  // no reason to keep it in Cloudflare logs either.
  if (!response.ok) {
    const body = await response.text();
    console.error(`House Dark cron failed: ${response.status}`);
    return { ok: false, status: response.status, body: body.slice(0, 300) };
  }
  return { ok: true, status: response.status };
}
