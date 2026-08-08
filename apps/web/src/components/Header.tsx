import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useCart } from "../hooks/useCart";
import { BasketIcon, ChevronLeftIcon } from "./Icons";

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { id: storeId } = useParams<{ id: string }>();
  const cart = useCart();

  const isHome = pathname === "/";
  const onStorePage = pathname.startsWith("/store/");

  // Inside a store, the basket only reflects that store's items.
  const items = cart.data ?? [];
  const relevant = onStorePage
    ? items.filter((i) => i.product?.partner?.id === storeId)
    : items;
  const count = relevant.reduce((sum, i) => sum + (i.quantity ?? 0), 0);

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {!isHome ? (
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-ink/60 transition hover:bg-ink/5 hover:text-ink"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
          ) : null}
          <Link to="/" className="flex items-center gap-2">
            <img src="/brand/icon.png" alt="" className="h-8 w-8 rounded-card" />
            <span className="font-display text-xl font-semibold tracking-[0.14em]">CADO</span>
          </Link>
        </div>

        <Link
          to={onStorePage ? `/cart?store=${storeId}` : "/cart"}
          aria-label="Cart"
          className="relative flex h-9 w-9 items-center justify-center rounded-pill text-ink/70 transition-all duration-150 hover:bg-ink/5 hover:text-ink active:scale-90"
        >
          <BasketIcon className="h-[22px] w-[22px]" />
          {count > 0 ? (
            <span
              key={count}
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 animate-bump items-center justify-center rounded-pill bg-gold px-1 text-[10px] font-semibold text-ink"
            >
              {count}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
