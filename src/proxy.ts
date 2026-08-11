import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request so server
 * components always see a valid cookie. Also fences the owner-only
 * Programming Desk and the signed-in app shell behind a session check.
 * Never touches anything that could carry a film title — this runs
 * before any opening data is fetched.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });

  if (!supabaseUrl || !supabaseAnonKey) {
    // Misconfigured deployment. Let the page-level env validation throw
    // a precise error rather than failing silently here.
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAppRoute = ["/tonight", "/circle", "/library", "/you", "/desk"].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (isAppRoute && !user) {
    const redirectUrl = new URL("/join", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match everything except static assets, PWA files and image
     * optimisation routes.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
