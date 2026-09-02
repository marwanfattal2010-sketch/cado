import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { usePoints, usePointsHistory } from "../hooks/useHeaderData";
import { ButtonLink } from "../components/ui";

/**
 * The Points page (spec 1.11).
 *
 * It says plainly that points cannot be spent yet. Somewhere between "you have
 * 340 points" and no way to use them is a customer who feels tricked, and the
 * honest version costs one sentence.
 */
export function Points() {
  const { session } = useAuth();
  const points = usePoints();
  const history = usePointsHistory();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">CADO points</h1>
        <p className="mt-2 text-body text-muted">Log in to see your points.</p>
        <ButtonLink to="/login" variant="accent" className="mt-6">Log in</ButtonLink>
      </div>
    );
  }

  const rows = history.data ?? [];

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="font-display text-h1">CADO points</h1>

      <div className="mt-4 rounded-card bg-persimmon p-5 text-white">
        <p className="text-caption opacity-90">Your balance</p>
        <p className="mt-1 text-[38px] font-black leading-none">{points.data ?? 0}</p>
        <p className="mt-1 text-caption opacity-90">points</p>
      </div>

      <div className="mt-4 rounded-card bg-surface p-4 shadow-rest">
        <p className="text-body font-semibold text-ink">How you earn</p>
        <p className="mt-1 text-body text-muted">
          1 point for every $1 on an order, added once it has been delivered.
        </p>
        <p className="mt-3 text-body font-semibold text-ink">Spending them</p>
        <p className="mt-1 text-body text-muted">
          Redeeming comes soon — points are being collected now so they are waiting for you when it opens.
        </p>
      </div>

      <h2 className="mt-6 font-display text-h2">History</h2>
      {history.isLoading ? null : rows.length === 0 ? (
        <p className="mt-2 text-body text-muted">
          Nothing yet — points appear here after your first delivered order.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block text-body text-ink">
                  {r.reason === "order_delivered" ? "Order delivered" : r.reason}
                </span>
                <span className="block text-caption text-muted">
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </span>
              <span className="shrink-0 text-body font-bold text-persimmon">
                {r.delta > 0 ? "+" : ""}{r.delta}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link to="/" className="mt-6 block text-center text-body font-medium text-muted underline underline-offset-4">
        Back to shopping
      </Link>
      <div className="h-24" />
    </div>
  );
}
