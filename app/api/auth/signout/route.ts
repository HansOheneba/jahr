import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * Clears the session and returns to login.
 *
 * This must be a Route Handler: Server Components cannot write cookies, so
 * signing out from a layout leaves the auth cookie in place and the proxy
 * bounces the request straight back to /dashboard.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/login", request.url));

  // Belt and braces: drop any Supabase auth cookie the SDK left behind so the
  // proxy cannot see a stale user and redirect back into the app.
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.delete(cookie.name);
    }
  }

  return response;
}
