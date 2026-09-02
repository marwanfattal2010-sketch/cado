import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useNotifications, useMarkNotificationRead } from "../hooks/useHeaderData";
import { ButtonLink } from "../components/ui";

/**
 * Notifications (spec 1.11). Real rows only — order status changes written by
 * the 0087 trigger. Nothing is seeded, so a new account correctly sees the
 * empty state rather than a sample message.
 */
export function Notifications() {
  const { session } = useAuth();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const navigate = useNavigate();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Notifications</h1>
        <p className="mt-2 text-body text-muted">Log in to see your updates.</p>
        <ButtonLink to="/login" variant="accent" className="mt-6">Log in</ButtonLink>
      </div>
    );
  }

  const rows = notifications.data ?? [];

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="font-display text-h1">Notifications</h1>

      {notifications.isLoading ? null : rows.length === 0 ? (
        <p className="mt-6 text-body text-muted">
          No notifications yet — order updates will show here.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {rows.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  if (!n.read_at) markRead.mutate(n.id);
                  if (n.link) navigate(n.link);
                }}
                className="flex w-full items-start gap-3 py-3.5 text-left"
              >
                {/* The dot IS the unread state — no bold-everything, no badge
                    on a row that has already been read. */}
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-pill ${n.read_at ? "bg-transparent" : "bg-persimmon"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-body ${n.read_at ? "text-muted" : "font-semibold text-ink"}`}>
                    {n.subject ?? "Update"}
                  </span>
                  {n.body ? <span className="mt-0.5 block text-caption text-muted">{n.body}</span> : null}
                  <span className="mt-0.5 block text-caption text-muted">
                    {new Date(n.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="h-24" />
    </div>
  );
}
