import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

/**
 * Supabase redirects an invited store owner here after they click the link in
 * their email. We exchange the code for a session (setting the httpOnly
 * cookies), then send them to /auth/set-password to choose a password. If the
 * link is a magic/invite token type, Supabase includes `?code=`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const base = publicEnv.NEXT_PUBLIC_SITE_URL || origin;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", base));
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", base));
  }

  return NextResponse.redirect(new URL("/auth/set-password", base));
}
