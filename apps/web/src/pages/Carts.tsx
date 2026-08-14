import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useAddresses, useCart, useRemoveCartItem } from "../hooks/useCart";
import { useCadoHours, closedLabel } from "../hooks/useCadoHours";
import { getArea, getAddressDetails } from "../lib/area";
import { primaryImage } from "../lib/images";
import { formatMoney } from "../lib/money";
import { ButtonLink, RibbonEmpty } from "../components/ui";
import { GiftIcon } from "../components/Icons";
import { DigitalCardMock } from "../components/giftcard/GiftCardArt";

type CartItem = NonNullable<ReturnType<typeof useCart>["data"]>[number];

type StoreCart = {
  partnerId: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  items: CartItem[];
  total: number;
};

/**
 * Where the delivery line comes from.
 *
 * The saved default address first, because that is the real thing we would
 * deliver to. Failing that, the area picked in the header plus whatever
 * street was typed into it. Nothing is invented: if there is no address at
 * all, the line says so rather than making up a label.
 */
function useDeliveryLine(): string {
  const addresses = useAddresses();
  const saved = addresses.data?.find((a) => a.is_default) ?? addresses.data?.[0];
  if (saved) {
    return [saved.street, saved.building, saved.area, saved.city].filter(Boolean).join(", ");
  }
  const details = getAddressDetails();
  const line = [details.street, details.building, getArea()].filter(Boolean).join(", ");
  return line || "No address saved yet";
}

/** Real logo where there is one, the store's first letter where there isn't. */
function StoreAvatar({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-pill bg-surface-sunk">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display text-h2 text-muted">{name.charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}

function CartCard({
  cart,
  deliveryLine,
  statusLabel,
  isOpen,
}: {
  cart: StoreCart;
  deliveryLine: string;
  statusLabel: string | null;
  isOpen: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const removeItem = useRemoveCartItem();

  const thumbs = cart.items.slice(0, 4);
  const extra = cart.items.length - thumbs.length;

  const deleteCart = () => {
    // One cart is one store's items; there is no cart row to delete.
    for (const item of cart.items) removeItem.mutate(item.id);
    setConfirmDelete(false);
    setMenuOpen(false);
  };

  return (
    <div className="overflow-hidden rounded-[16px] border border-line bg-surface">
      {/* Status strip. Muted grey when closed — a shop being shut at night is
          normal, not an error, so it is never red. */}
      <div
        className={`px-4 py-2 text-caption font-medium ${
          isOpen ? "bg-persimmon/10 text-persimmon" : "bg-surface-sunk text-muted"
        }`}
      >
        {statusLabel ?? "Open"}
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <StoreAvatar name={cart.name} logoUrl={cart.logoUrl} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-h2">{cart.name}</p>
            <p className="mt-0.5 truncate text-caption text-muted">{deliveryLine}</p>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Cart options"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-pill text-muted hover:bg-surface-sunk"
            >
              ⋯
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-card border border-line bg-surface shadow-lift">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex min-h-[44px] w-full items-center px-3 text-left text-body"
                >
                  Delete cart
                </button>
                {/* The address is chosen and saved at checkout — that is the
                    only screen that collects one, so this goes there rather
                    than to a settings page that does not exist. */}
                <Link
                  to={`/checkout?store=${cart.partnerId}`}
                  className="flex min-h-[44px] w-full items-center border-t border-line px-3 text-body"
                >
                  Change address
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {confirmDelete ? (
          <div className="mt-3 rounded-card border border-line p-3">
            <p className="text-body">
              Delete this cart? {cart.items.length} item{cart.items.length === 1 ? "" : "s"} from {cart.name}{" "}
              will be removed.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={deleteCart}
                className="min-h-[44px] rounded-card bg-persimmon px-4 text-body font-medium text-white"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[44px] px-4 text-body text-ink underline underline-offset-4"
              >
                Keep it
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex items-center gap-2">
          {thumbs.map((item) => {
            const uri = primaryImage(item.product?.product_images);
            return (
              <span
                key={item.id}
                className="h-12 w-12 shrink-0 overflow-hidden rounded-card bg-surface-sunk"
              >
                {uri ? <img src={uri} alt="" className="h-full w-full object-cover" /> : null}
              </span>
            );
          })}
          {extra > 0 ? (
            <span className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-card bg-persimmon px-2 text-caption font-semibold text-white">
              +{extra}
            </span>
          ) : null}
          <span className="ml-auto text-price">{formatMoney(cart.total)}</span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Link
            to={cart.slug ? `/store/${cart.slug}` : "/"}
            className="flex min-h-[44px] flex-1 items-center justify-center text-body font-medium text-ink underline underline-offset-4"
          >
            Add more items
          </Link>
          <Link
            to={`/cart?store=${cart.partnerId}`}
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-card bg-persimmon text-body font-medium text-white transition-transform duration-press ease-out active:scale-[0.98]"
          >
            View cart
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * One card per store, because one order is one store — a driver goes to one
 * shop and comes back. Adding something from a second shop never touches the
 * first cart; it simply makes a second one.
 */
export function Carts() {
  const { session } = useAuth();
  const cart = useCart();
  const hours = useCadoHours();
  const deliveryLine = useDeliveryLine();

  /**
   * The gift card cart. It is its own card because a gift card is not sold
   * by anybody — there is no shop to drive to — so it can never share an
   * order with store items. The database refuses that outright; this is
   * just the screen agreeing with it.
   */
  const giftCards = useMemo(() => {
    const lines = (cart.data ?? []).filter((i) => i.gift_card_amount_cents != null);
    const total = lines.reduce((sum, i) => sum + ((i.gift_card_amount_cents ?? 0) / 100) * i.quantity, 0);
    return { lines, total };
  }, [cart.data]);

  const carts = useMemo<StoreCart[]>(() => {
    const map = new Map<string, StoreCart>();
    for (const item of cart.data ?? []) {
      const partner = item.product?.partner;
      if (!partner?.id) continue;
      if (!map.has(partner.id)) {
        map.set(partner.id, {
          partnerId: partner.id,
          name: partner.name ?? "Store",
          slug: (partner as { slug?: string | null }).slug ?? null,
          logoUrl: (partner as { logo_url?: string | null }).logo_url ?? null,
          items: [],
          total: 0,
        });
      }
      const group = map.get(partner.id)!;
      group.items.push(item);
      group.total += (item.product?.price ?? 0) * item.quantity;
    }
    return Array.from(map.values());
  }, [cart.data]);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-h1">Your carts</h1>
        <p className="mt-2 text-body text-muted">Log in to see your carts.</p>
        <ButtonLink to="/login" variant="accent" className="mt-6">
          Log in
        </ButtonLink>
      </div>
    );
  }

  if (cart.isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6" aria-busy="true">
        <div className="skeleton h-7 w-40 rounded-pill" />
        <div className="skeleton mt-5 h-44 w-full rounded-[16px]" />
      </div>
    );
  }

  if (carts.length === 0 && giftCards.lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <RibbonEmpty className="mx-auto h-14 w-14" />
        <h1 className="mt-3 font-display text-h1">Your carts</h1>
        {/* One line, nothing else. No sample store cards. */}
        <p className="mt-2 text-body text-muted">Nothing in a cart yet.</p>
        <ButtonLink to="/" variant="accent" className="mt-6">
          Browse gifts
        </ButtonLink>
      </div>
    );
  }

  const label = closedLabel(hours.data ?? { known: false });
  const isOpen = !label;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-32">
      <h1 className="font-display text-h1">Your carts</h1>
      <p className="mt-1 text-caption text-muted">
        One cart per store — each one is delivered on its own trip, so they're checked out separately.
      </p>

      <div className="mt-5 space-y-4">
        {giftCards.lines.length > 0 ? (
          <div className="overflow-hidden rounded-[16px] border border-line bg-surface">
            {/* Always open: a digital card is not delivered by anybody, and
                a printed one is posted with the next round. Neither waits on
                a shop opening. */}
            <div className="bg-persimmon/10 px-4 py-2 text-caption font-medium text-persimmon">Open</div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-pill bg-persimmon/10">
                  <GiftIcon className="h-6 w-6 text-persimmon" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-h2">CADO gift card</p>
                  <p className="mt-0.5 truncate text-caption text-muted">
                    {giftCards.lines.length === 1
                      ? "Spendable at every store on CADO"
                      : `${giftCards.lines.length} cards · spendable at every store on CADO`}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {giftCards.lines.slice(0, 4).map((line) => (
                  <span key={line.id} className="h-12 w-[68px] shrink-0 overflow-hidden rounded-card">
                    <DigitalCardMock
                      amount={formatMoney((line.gift_card_amount_cents ?? 0) / 100)}
                      className="h-full w-full"
                    />
                  </span>
                ))}
                {giftCards.lines.length > 4 ? (
                  <span className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-card bg-persimmon px-2 text-caption font-semibold text-white">
                    +{giftCards.lines.length - 4}
                  </span>
                ) : null}
                <span className="ml-auto text-price">{formatMoney(giftCards.total)}</span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Link
                  to="/gift-cards/send"
                  className="flex min-h-[44px] flex-1 items-center justify-center text-body font-medium text-ink underline underline-offset-4"
                >
                  Add another
                </Link>
                <Link
                  to="/cart?gift-cards=1"
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-card bg-persimmon text-body font-medium text-white transition-transform duration-press ease-out active:scale-[0.98]"
                >
                  View cart
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {carts.map((c) => (
          <CartCard
            key={c.partnerId}
            cart={c}
            deliveryLine={deliveryLine}
            statusLabel={label}
            isOpen={isOpen}
          />
        ))}
      </div>
    </div>
  );
}
