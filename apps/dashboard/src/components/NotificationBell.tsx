"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Note = {
  id: string;
  subject: string | null;
  body: string | null;
  template: string;
  created_at: string;
};

/**
 * The bell (§3.3). Reads the notifications table under the viewer's own RLS
 * — a store sees notifications about its own orders, an admin sees all —
 * and refreshes on Supabase Realtime so a new order rings without a reload.
 *
 * "Unread" is session-local (last-opened timestamp in localStorage) because
 * the notifications table has no per-user read marker yet; a read_at column
 * per recipient is queued for a later migration. The count is honest about
 * what it is: notifications since you last opened the bell.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [lastSeen, setLastSeen] = useState<string>(() => {
    try {
      return localStorage.getItem("cado-bell-seen") ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, subject, body, template, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) setNotes((data ?? []) as Note[]);
    };
    void load();

    const channel = supabase
      .channel("bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => void load())
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  const unread = notes.filter((n) => !lastSeen || n.created_at > lastSeen).length;

  const openBell = () => {
    setOpen((v) => !v);
    const now = new Date().toISOString();
    setLastSeen(now);
    try {
      localStorage.setItem("cado-bell-seen", now);
    } catch {
      /* blocked storage must not break the bell */
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openBell}
        aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-pill text-muted transition-colors hover:bg-surface-sunk hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9Z" strokeLinejoin="round" />
          <path d="M10 20a2.2 2.2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-ribbon px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-40 w-80 rounded-2xl border border-line bg-surface p-2 shadow-lift">
          {notes.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line/60 overflow-y-auto">
              {notes.map((n) => (
                <li key={n.id} className="px-3 py-2.5">
                  <p className="text-sm font-medium text-ink">{n.subject ?? n.template.replace(/_/g, " ")}</p>
                  {n.body ? <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p> : null}
                  <p className="mt-0.5 text-[10px] text-muted">
                    {new Date(n.created_at).toLocaleString("en-GB")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
