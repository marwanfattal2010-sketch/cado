import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAddresses, useCart, useUpdateAddress } from "../hooks/useCart";
import { useStore } from "../hooks/useStores";
import { useAuth } from "../lib/auth";
import { GiftBagIcon, ChevronLeftIcon, PinIcon } from "./Icons";
import { PointsPill, NotificationBell } from "./HeaderActions";
import {
  useArea,
  getAddressDetails,
  setAddressDetails,
  type AddressDetails,
} from "../lib/area";
import { LocationSheet } from "./location/LocationSheet";
import { chipLabel, useDeliveryLocation } from "../lib/deliveryLocation";

/**
 * Collapse-on-scroll thresholds.
 *
 * COLLAPSE_AFTER is far enough down that the logo row never flickers away
 * while someone is nudging the top of the page around; COLLAPSE_DELTA is the
 * movement needed before a direction counts, so a trackpad or a rubber-band
 * settle can't toggle it every frame.
 */
const COLLAPSE_AFTER = 140;
const COLLAPSE_DELTA = 8;
/** Only the pre-hydration fallback in index.css, restated so the spacer has
 *  a sane height for the single frame before the row is measured. */
const HEADER_FALLBACK_H = 69;
/** What is left of the header once the row is squeezed away: its hairline. */
const HEADER_COLLAPSED_H = 1;

export function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { slug: storeSlug } = useParams<{ slug: string }>();
  const cart = useCart();
  const { session } = useAuth();
  const addresses = useAddresses();
  const updateAddress = useUpdateAddress();
  const [area] = useArea();
  const [deliveryLocation] = useDeliveryLocation();
  const chip = chipLabel(deliveryLocation);
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

  /**
   * The route param is a slug now, and cart rows carry a partner uuid, so the
   * two can no longer be compared directly. Resolving it here costs nothing:
   * the store page itself runs the identical query under the same react-query
   * key, so this is a cache read rather than a second request.
   */
  const storePartner = useStore(onStorePage ? storeSlug : undefined);
  const storeId = storePartner.data?.id;

  /**
   * Inside a store the basket shows that store's items; everywhere else it
   * shows how many CARTS there are, not how many things are in them.
   *
   * That is the whole point of separate carts: a driver goes to one shop, so
   * three items from one shop is one journey and one number worth knowing,
   * while one item each from three shops is three separate deliveries to
   * check out one at a time.
   */
  const items = cart.data ?? [];
  const relevant = onStorePage ? items.filter((i) => i.product?.partner?.id === storeId) : items;
  const count = onStorePage
    ? relevant.reduce((sum, i) => sum + (i.quantity ?? 0), 0)
    : new Set(items.map((i) => i.product?.partner?.id).filter(Boolean)).size;

  /**
   * COLLAPSE ON SCROLL DOWN, REAPPEAR ON SCROLL UP.
   *
   * Homepage only, and deliberately so: on the homepage the header is stacked
   * on top of the search field and the category rail, which together were
   * eating roughly a third of a 375x812 screen. On an inner page the same
   * row carries the back button, and hiding a back button behind a scroll
   * gesture is a worse trade than the 68px it buys back.
   *
   * No prefers-reduced-motion branch is needed here: index.css already
   * flattens every transition to 0.01ms under that query, so the row snaps
   * instead of sliding and the layout still ends up in the same place.
   */
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(false);

  useEffect(() => {
    if (!isHome) {
      collapsedRef.current = false;
      setCollapsed(false);
      return;
    }
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - last;
      // Below the threshold the gesture hasn't declared a direction yet, and
      // `last` deliberately does NOT move — otherwise a slow drag never
      // accumulates enough delta to count as anything.
      if (Math.abs(dy) < COLLAPSE_DELTA) return;
      last = y;
      const next = dy > 0 && y > COLLAPSE_AFTER;
      if (next === collapsedRef.current) return;
      collapsedRef.current = next;
      setCollapsed(next);
    };
    // No requestAnimationFrame wrapper: reading scrollY is a cheap, already
    // up-to-date value, and a frame callback never arrives in a backgrounded
    // tab — which is exactly where a stale collapsed state would strand the
    // sticky rail behind a header that is no longer there.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  /**
   * MEASURE the header's expanded height.
   *
   * Everything pinned below the header (the homepage search + category rail,
   * the category page's rail) offsets by --header-h. Hardcoding it is how
   * the top of the search bar ended up hidden behind the header: the number
   * in the stylesheet was 57px, the header was 61px on the homepage and 89px
   * on inner pages, and nothing complained. Measuring means the two can
   * never disagree again — including on a late font load or a wrapped
   * "Deliver to" label.
   *
   * What is measured is the ROW, not the header, and that distinction is the
   * whole reason the collapse works. The row keeps its natural height even
   * while its grid wrapper is squeezed to 0fr, so this stays the EXPANDED
   * height — which is what the flow spacer has to reserve and what the
   * sticky rail has to return to. + 1 for the header's hairline border.
   */
  const rowRef = useRef<HTMLDivElement>(null);
  const [expandedH, setExpandedH] = useState(HEADER_FALLBACK_H);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    // Measured synchronously in a layout effect — after the DOM is in place,
    // before paint. Not in requestAnimationFrame: a frame callback never
    // arrives in a backgrounded or headless tab, and this must be right on
    // the very first render.
    const measure = () => setExpandedH(Math.round(row.getBoundingClientRect().height) + 1);
    measure();
    // ResizeObserver is the belt to the route-change braces: it catches a
    // late font load or an orientation change. It is deliberately not the
    // only mechanism — the effect re-runs on every navigation too, because
    // a missed notification means a sticky bar sitting behind the header
    // with nothing to indicate anything is wrong.
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [pathname]);

  /**
   * PUBLISH --header-h from state, not from a live measurement of the
   * collapsing header.
   *
   * The obvious version of this observed the header itself and republished
   * its height every frame of the collapse. It is wrong twice over: a
   * ResizeObserver is only delivered inside the rendering lifecycle, so a
   * dropped frame leaves the rail pinned to a height the header no longer
   * has; and it makes a sticky offset depend on an animation actually
   * running. Deriving it from `collapsed` gives both ends of the transition
   * exactly once, up front, and the rail's own `top` transition — same
   * duration, same easing, see Home.tsx — carries it between them in step
   * with the header.
   */
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--header-h",
      `${collapsed ? HEADER_COLLAPSED_H : expandedH}px`
    );
  }, [collapsed, expandedH]);

  return (
    <>
      {/*
        The header is position:fixed, not sticky, and this spacer holds its
        expanded height open in normal flow.

        A sticky header that shrinks also shrinks the document above
        everything after it, so the whole page jumps up by the collapsed
        amount at an unchanged scroll position — a 68px lurch and a real
        layout shift. Taking the header out of flow and reserving its space
        once means collapsing it moves nothing but the header.
      */}
      <div aria-hidden style={{ height: expandedH }} />
      {/* THE HEADER. White, not persimmon: the header, the tab strip and the search
          field are one block of colour that the white content sheet sits
          inside. That is what makes the app feel like a place rather than a
          document — and it is why persimmon can stay rare enough to mean
          "press this". */}
      <header className="fixed inset-x-0 top-0 z-20 bg-header-bg">
        {/*
          grid-template-rows 1fr -> 0fr, which is the one way to transition to
          and from an auto height. The inner div must own the overflow-hidden
          or the row paints straight through the collapsed track.
        */}
        <div
          className="grid transition-[grid-template-rows] duration-base ease-ease"
          style={{ gridTemplateRows: collapsed ? "0fr" : "1fr" }}
        >
          <div className="overflow-hidden">
        {/* 68px = a 44px content row + 2 x 12px padding, and it is written
            as the border-box total because Tailwind's preflight sets
            box-sizing: border-box — a min-h-[44px] here quietly resolves to
            a 44px OUTER box and does nothing. This keeps the header exactly
            the same height with and without the back button, so --header-h
            never jumps on navigation. */}
        <div
          ref={rowRef}
          className="mx-auto flex min-h-[68px] max-w-6xl items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            {!isHome ? (
              <button
                onClick={() => navigate(-1)}
                aria-label="Go back"
                /* h-11 = 44px. NOT h-8: this project's spacing scale maps 8
                   to 64px, so h-8 w-8 built a 64px button that pushed the
                   whole header from 61px to 89px on every inner page — and
                   with it every sticky bar measured from the header. */
                className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-header-fg/80 transition hover:bg-header-fg/[0.06] hover:text-header-fg"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
            ) : null}
            {/*
              NO LOGO IN THE HEADER (spec 1.11). Toters, Trendyol and Amazon
              all spend this row on what a shopper needs — where it is going
              and what is waiting for them — not on reminding them which app
              they opened. The brand lives on the splash screen and Account.

              Its place is taken by the address, which is the single most
              consequential thing on a same-day delivery app.
            */}
            {/*
              THE CHIP. A filled persimmon disc, because this is the one
              control in the header whose value changes what the whole app
              shows — where the order is going. It read as a grey label
              before, which is how someone browses a whole session without
              noticing the city is wrong.

              "Set your location" in persimmon when nothing is set. NOT a
              default city printed as though it were a choice: that is how an
              order ends up at the wrong end of the country.
            */}
            <button
              onClick={openAreaSheet}
              className="tap-44 flex min-w-0 items-center gap-2 rounded-pill px-1 py-1 text-left transition-transform duration-press ease-out active:scale-[0.97]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-persimmon">
                <PinIcon className="h-[15px] w-[15px] text-white" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] leading-none text-header-muted">Deliver to</span>
                <span className="flex items-center gap-1 text-body font-bold leading-tight">
                  <span
                    className={`truncate ${chip.unset ? "text-persimmon" : "text-header-fg"}`}
                  >
                    {chip.text}
                  </span>
                  <span aria-hidden className="text-[10px] font-normal text-header-fg">▾</span>
                </span>
              </span>
            </button>
          </div>

          <div className="flex min-w-0 items-center gap-1">
            <PointsPill />
            <NotificationBell />

            <Link
              to={onStorePage ? `/cart?store=${storeId}` : "/cart"}
              aria-label={
                onStorePage
                  ? `Cart, ${count} item${count === 1 ? "" : "s"}`
                  : `Your carts, ${count} cart${count === 1 ? "" : "s"}`
              }
              className="tap-44 relative flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-header-fg transition-all duration-fast hover:bg-header-fg/[0.06] active:scale-90"
            >
              <GiftBagIcon className="h-[22px] w-[22px]" />
              {count > 0 ? (
                <span
                  key={count}
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 animate-bump items-center justify-center rounded-pill bg-header-badge px-1 text-[10px] font-semibold text-white"
                >
                  {count}
                </span>
              ) : null}
            </Link>
          </div>
            </div>
          </div>
        </div>
      </header>

      <LocationSheet open={areaOpen} onClose={closeAreaSheet} />
    </>
  );
}
