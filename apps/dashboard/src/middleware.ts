/**
 * Refresh the Supabase session cookie on every request, and keep
 * unauthenticated users out of everything except the auth routes. Role-based
 * routing (admin vs store) is enforced again in each layout with a fresh DB
 * read — middleware only checks "is there a session at all", because the Edge
 * runtime shouldn't be doing privileged DB lookups.
 */
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// /apply is the one truly public page: a store that cannot reach the
// application form cannot apply.
const PUBLIC_PREFIXES = ["/login", "/auth", "/logout", "/apply"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|woff2)$).*)"],
};
