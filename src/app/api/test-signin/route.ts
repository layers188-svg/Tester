import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";

/**
 * TESTING ONLY — signs in with an email address and nothing else.
 *
 * This is an authentication bypass. It exists because the Founding Beta
 * cannot currently receive a sign-in code at all: Supabase's free tier
 * rate-limits its built-in email to a couple of messages an hour
 * (`429 over_email_send_rate_limit`), and refuses to edit the Magic
 * Link template while that provider is in use — so the template still
 * sends `{{ .ConfirmationURL }}` rather than the six-digit
 * `{{ .Token }}` the form asks for. There is no configuration that
 * produces a working code until Resend is wired up as custom SMTP.
 *
 * What it costs while it is switched on: anyone who knows the URL can
 * sign in as any address, including one in ADMIN_EMAILS, which carries
 * the Programming Desk and therefore protected title data. That is
 * acceptable only because the project currently holds no real members
 * and no programmed film. It stops being acceptable the moment either
 * exists.
 *
 * Removal is one environment variable: unset TEST_SIGNIN_KEY — the
 * variable checked immediately below — and this route 404s. On the
 * deployed worker that is `npx wrangler secret delete TEST_SIGNIN_KEY`
 * followed by a rebuild and redeploy; see LAUNCH_CHECKLIST item 9 for
 * the exact sequence. Do it as part of configuring custom SMTP (item 2),
 * which is what makes the bypass unnecessary.
 *
 * There is no NEXT_PUBLIC_TEST_SIGNIN. An earlier version of this note
 * named one, which would have been a dangerous thing to follow: unsetting
 * a variable that does not exist changes nothing, and the bypass would
 * have stayed live on a deployment believed to be closed.
 */
export async function POST(request: Request) {
  const env = getServerEnv();

  // 404 rather than 403: a disabled bypass should not confirm it exists.
  if (!env.TEST_SIGNIN_KEY) {
    return new NextResponse("Not found", { status: 404 });
  }

  let email: string;
  let key: string;
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim() : "";
    key = typeof body?.key === "string" ? body.key : "";
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  // Also 404 on a wrong key. A 401 here would confirm to anyone poking
  // at the route that a bypass exists and only the key is missing.
  if (key !== env.TEST_SIGNIN_KEY) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter an email address." }, { status: 400 });
  }

  // Mint a real OTP without delivering it. `generate_link` returns
  // `email_otp` in its response and sends nothing, which is the whole
  // reason this works while the mail provider is unusable.
  const service = getServiceSupabase();
  const { data: link, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const otp = link?.properties?.email_otp;
  if (linkError || !otp) {
    return NextResponse.json({ error: "Could not start a session." }, { status: 502 });
  }

  // Redeem it through the cookie-writing client so the session lands as
  // the same httpOnly cookies a normal sign-in would set. Nothing about
  // the session itself is special — only how the code was obtained.
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: "email",
  });

  if (verifyError) {
    return NextResponse.json({ error: "Could not start a session." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
