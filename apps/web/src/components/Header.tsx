import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAddresses, useCart, useUpdateAddress } from "../hooks/useCart";
import { useAuth } from "../lib/auth";
import { BrandLogo } from "./BrandLogo";
import { BasketIcon, ChevronLeftIcon } from "./Icons";
import {
  AREAS,
  useArea,
  getAddressDetails,
  setAddressDetails,
  type AddressDetails,
} from "../lib/area";
import { Button, Sheet } from "./ui";

const FIELD =
  "w-full rounded-card border border-line bg-surface px-4 py-3 text-body outline-none placeholder:text-muted focus:border-ink/35";

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { id: storeId } = useParams<{ id: string }>();
  const cart = useCart();
  const { session } = useAuth();
  const addresses = useAddresses();
  const updateAddress = useUpdateAddress();
  const [area, setArea] = useArea();
  const [areaOpen, setAreaOpen] = useState(false);
  const [details, setDetails] = useState<AddressDetails>(() => getAddressDetails());

  const openAreaSheet = () => {
    setDetails(getAddressDetails());
    setAreaOpen(true);
  };

  /** Every way out of the sheet keeps what was typed: the details go to
   *  localStorage (what checkout prefills from), and — if signed in with an
   *  address record already — the same street fields update that record, the
   *  same plumbing checkout uses. Leaving everything blank still works
   *  exactly like the old city-only picker. */
  const closeAreaSheet = () => {
    setAddressDetails(details);
    const existing = addresses.data?.[0];
    if (session && existing && details.street.trim()) {
      updateAddress.mutate({
        id: existing.id,
        city: area,
        street: details.street.trim(),
        building: details.building.trim() || null,
        floor: details.floor.trim() || null,
        apartment: details.apartment.trim() || null,
        notes: details.notes.trim() || null,
      });
    }
    setAreaOpen(false);
  };

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
                className="tap-44 -ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-muted transition hover:bg-surface-sunk hover:text-ink"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
            ) : null}
            <Link to="/" className="flex shrink-0 items-center" aria-label="CADO home">
              {/* h-[32px], not h-8: the project's spacing scale maps 8 to 64px. */}
              <BrandLogo variant="ink" className="h-[32px] w-auto" />
            </Link>
          </div>

          <div className="flex min-w-0 items-center gap-1">
            {/* The whole promise is same-day delivery, so the site has to ask
                where the customer is. */}
            <button
              onClick={openAreaSheet}
              className="tap-44 flex min-w-0 items-center gap-1 rounded-pill px-2 py-1.5 text-caption text-muted transition hover:bg-surface-sunk hover:text-ink"
            >
              <span className="truncate">
                Deliver to <span className="font-medium text-ink">{area}</span>
              </span>
              <span aria-hidden className="text-[10px]">▾</span>
            </button>

            <Link
              to={onStorePage ? `/cart?store=${storeId}` : "/cart"}
              aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
              className="tap-44 relative flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-muted transition-all duration-fast hover:bg-surface-sunk hover:text-ink active:scale-90"
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

      <Sheet open={areaOpen} onClose={closeAreaSheet} title="Where are we delivering?">
        <div className="flex flex-col gap-2">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a)}
              className={`flex min-h-[52px] items-center justify-between rounded-card px-4 py-3.5 text-left text-body transition ${
                a === area ? "bg-ribbon-tint font-medium text-ink" : "bg-surface-sunk text-ink hover:bg-line"
              }`}
            >
              {a}
              {a === area ? <span className="text-ribbon">✓</span> : null}
            </button>
          ))}
        </div>
        {/* Honest scope, not a fake long list. */}
        <p className="mt-3 text-caption text-muted">More cities soon.</p>

        <div className="mt-5 border-t border-line pt-4">
          <p className="text-body font-medium">
            Your address <span className="font-normal text-muted">(optional)</span>
          </p>
          <p className="mt-0.5 text-caption text-muted">
            We’ll prefill it at checkout so you don’t retype it.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <input
              className={FIELD}
              placeholder="Street"
              value={details.street}
              onChange={(e) => setDetails({ ...details, street: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                className={FIELD}
                placeholder="Building"
                value={details.building}
                onChange={(e) => setDetails({ ...details, building: e.target.value })}
              />
              <input
                className={FIELD}
                placeholder="Floor"
                value={details.floor}
                onChange={(e) => setDetails({ ...details, floor: e.target.value })}
              />
              <input
                className={FIELD}
                placeholder="Apt"
                value={details.apartment}
                onChange={(e) => setDetails({ ...details, apartment: e.target.value })}
              />
            </div>
            <input
              className={FIELD}
              placeholder="Notes for the driver (landmark, gate code…)"
              value={details.notes}
              onChange={(e) => setDetails({ ...details, notes: e.target.value })}
            />
          </div>
          <Button fullWidth className="mt-4" onClick={closeAreaSheet}>
            Done
          </Button>
        </div>
      </Sheet>
    </>
  );
}
