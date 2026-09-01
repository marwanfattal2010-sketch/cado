import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

/**
 * CADO's own page-view counter (V5 §2). No third party, no cookies, no IP, no
 * personal data.
 *
 * What it records: a random session id kept in sessionStorage (gone when the
 * tab closes), the path, the referring HOST only, and whether the screen is
 * phone-sized. That is enough to answer "how many people came and what did they
 * look at", and deliberately not enough to follow anyone.
 *
 * What it refuses to record:
 *   - anyone who has Do Not Track on;
 *   - CADO's own staff, so browsing your own shop never inflates your numbers.
 *
 * It is fire-and-forget: the insert is never awaited on the render path and its
 * errors are swallowed. Analytics must never be the reason a page is slow or a
 * navigation fails — a missing row is a smaller problem than a broken shop.
 */

const SESSION_KEY = "cado-session";

function sessionId(): string | null {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private mode throws on access rather than returning null. Without a
    // session id there is nothing to group views by, so we simply don't record.
    return null;
  }
}

function device(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function referrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const url = new URL(document.referrer);
    // Host only — the full URL of the page someone came from can carry their
    // search terms and is more than we need.
    return url.host === window.location.host ? null : url.host;
  } catch {
    return null;
  }
}

export function useTrackPageView() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Respect the browser's own setting without argument.
    if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;

    const path = location.pathname;
    // React StrictMode double-invokes effects in development; without this the
    // same view is counted twice.
    if (lastPath.current === path) return;
    lastPath.current = path;

    const sid = sessionId();
    if (!sid) return;

    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id ?? null;

        if (uid) {
          // Don't count CADO's own people looking at their own shop.
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", uid)
            .maybeSingle();
          if (profile && profile.role !== "customer") return;
        }

        await supabase.from("site_events").insert({
          session_id: sid,
          user_id: uid,
          event: "page_view",
          path: path.slice(0, 300),
          referrer: referrerHost(),
          device: device(),
        });
      } catch {
        /* analytics must never break the shop */
      }
    })();
  }, [location.pathname]);
}
