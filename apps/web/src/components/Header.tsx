import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { BasketIcon, ChevronLeftIcon } from "./Icons";
import { AREAS, useArea } from "../lib/area";
import { Sheet } from "./ui";

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { id: storeId } = useParams<{ id: string }>();
  const cart = useCart();
  const [area, setArea] = useArea();
  const [areaOpen, setAreaOpen] = useState(false);

  const isHome = pathname === "/";
  const onStorePage = pathname.startsWith("/store/");

  // Inside a store, the basket only reflects that store's items.
  const items = cart.data ?? [];
  const relevant = onStorePage ? items.filter((i) => i.product?.partner?.id === storeId) : items;
  const count = relevant.reduce((sum, i) => sum + (i.quantity ?? 0), 0);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {!isHome ? (
              <button
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-muted transition hover:bg-surface-sunk hover:text-ink"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
            ) : null}
            <Link to="/" className="flex shrink-0 items-center gap-2">
              {/* Gold plate, dark mark — the original was a dark mark on a
                  near-black square, which disappeared at header size. */}
              <span
                className="flex h-8 w-8 items-center justify-center rounded-card bg-gold font-display text-[15px] font-semibold text-ink"
                aria-hidden
              >
                C
              </span>
              <span className="font-display text-xl font-semibold tracking-[0.14em]">CADO</span>
            </Link>
          </div>

          <div className="flex min-w-0 items-center gap-1">
            {/* The whole promise is same-day delivery, so the site has to ask
                where the customer is. */}
            <button
              onClick={() => setAreaOpen(true)}
              className="flex min-w-0 items-center gap-1 rounded-pill px-2 py-1.5 text-caption text-muted transition hover:bg-surface-sunk hover:text-ink"
            >
              <span className="truncate">
                Deliver to <span className="font-medium text-ink">{area}</span>
              </span>
              <span aria-hidden className="text-[10px]">▾</span>
            </button>

            <Link
              to={onStorePage ? `/cart?store=${storeId}` : "/cart"}
              aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-ink/70 transition-all duration-fast hover:bg-surface-sunk hover:text-ink active:scale-90"
            >
              <BasketIcon className="h-[22px] w-[22px]" />
              {count > 0 ? (
                <span
                  key={count}
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 animate-bump items-center justify-center rounded-pill bg-ribbon px-1 text-[10px] font-semibold text-inverse"
                >
                  {count}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      <Sheet open={areaOpen} onClose={() => setAreaOpen(false)} title="Where are we delivering?">
        <div className="flex flex-col gap-2">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => {
                setArea(a);
                setAreaOpen(false);
              }}
              className={`flex items-center justify-between rounded-card px-4 py-3.5 text-left text-body transition ${
                a === area ? "bg-ribbon-tint font-medium text-ink" : "bg-surface-sunk text-ink hover:bg-line"
              }`}
            >
              {a}
              {a === area ? <span className="text-ribbon">✓</span> : null}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
