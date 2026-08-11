"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * "Live" feed by honest means: re-fetch the server component tree every 20s
 * while the tab is visible. No websocket infrastructure to run or secure, and
 * a new order appears within one interval — good enough for a store checking
 * their phone, and nothing to break at 3am.
 */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}
