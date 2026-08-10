import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

/** POST /logout — clear the session cookies and return to login. */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", publicEnv.NEXT_PUBLIC_SITE_URL), {
    status: 303,
  });
}
