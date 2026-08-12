import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { primaryImage } from "../lib/images";
import { formatMoney } from "../lib/money";
import { useCart, useRemoveCartItem, useUpdateCartQuantity } from "../hooks/useCart";
import { RibbonEmpty } from "../components/ui";

const DELIVERY_FEE = 5;

/**
 * The cart only holds and edits. Everything that decides an order — address,
 * gift options, payment — lives on one checkout page, so this screen never
 * makes anyone read two sets of the same fields.
 */
export function Cart() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Opening the cart from inside a store shows only that store's items.
  const storeFilter = params.get("store");
  const cart = useCart();
  const removeItem = useRemoveCartItem();
  const updateQuantity = useUpdateCartQuantity();

  const visibleItems = useMemo(() => {
    if (!cart.data) return [];
    if (!storeFilter) return cart.data;
    return cart.data.filter((i) => i.product?.partner?.id === storeFilter);
  }, [cart.data, storeFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, { partnerName: string; items: typeof visibleItems }>();
    for (const item of visibleItems) {
      const id = item.product?.partner?.id ?? "unknown";
      const partnerName = item.product?.partner?.name ?? "Store";
      if (!map.has(id)) map.set(id, { partnerName, items: [] });
      map.get(id)!.items.push(item);
    }
    return Array.from(map.values());
  }, [visibleItems]);

  // Price times quantity, nothing else. There is no wrap surcharge to add:
  // CADO does not wrap, and the client must not invent a line the server
  // will not charge.
  const subtotal = useMemo(
    () => visibleItems.reduce((sum, item) => sum + (item.product?.price ?? 0) * item.quantity, 0),
    [visibleItems]
  );

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-h1">Your cart</h1>
        <p className="mt-2 text-body text-muted">Log in to see your cart.</p>
        <Link
          to="/login"
          className="mt-6 inline-flex h-[52px] items-center rounded-pill bg-primary px-8 text-body font-medium text-inverse"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <RibbonEmpty className="mx-auto h-14 w-14" />
        <h1 className="mt-3 font-display text-h1">
          {storeFilter ? "Nothing from this store yet" : "Your cart is empty"}
        </h1>
        <p className="mt-2 text-body text-muted">Tell us who it's for and we'll narrow it down.</p>
        <Link
          to="/gift-finder"
          className="mt-6 inline-flex h-[52px] items-center rounded-pill bg-primary px-8 text-body font-medium text-inverse"
        >
          Browse gifts
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-32">
      <h1 className="font-display text-h1">Your cart</h1>
      {storeFilter ? (
        <Link to="/cart" className="mt-1 inline-block text-caption text-muted underline">
          See items from all stores
        </Link>
      ) : null}

      <div className="mt-5 space-y-6">
        {groups.map((group) => (
          <div key={group.partnerName}>
            {/* Multi-store orders arrive as separate deliveries — say which
                store each item comes from rather than surprising them later. */}
            <p className="mb-2 text-eyebrow uppercase text-muted">{group.partnerName}</p>
            <div className="space-y-2">
              {group.items.map((item) => {
                const uri = primaryImage(item.product?.product_images);
                // What was chosen on the product page. note_to / note_from are
                // no longer written but older cart rows still carry them, so
                // they are still rendered rather than silently dropped.
                const c = item.customization as
                  | { message?: string; note_to?: string; note_from?: string; hide_price?: boolean }
                  | null;
                const note = [
                  c?.note_to ? `To ${c.note_to}` : null,
                  c?.message ? `"${c.message}"` : null,
                  c?.note_from ? `— ${c.note_from}` : null,
                ].filter(Boolean);
                return (
                  <div key={item.id} className="flex gap-3 rounded-card bg-surface p-3 shadow-rest">
                    <Link
                      to={`/product/${item.product?.id}`}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-card bg-surface-sunk"
                    >
                      {uri ? <img src={uri} alt="" className="h-full w-full object-cover" /> : null}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/product/${item.product?.id}`} className="text-product-name">
                        {item.product?.title}
                      </Link>
                      <p className="mt-0.5 text-price">{formatMoney(item.product?.price)}</p>
                      {note.length ? (
                        <p className="mt-1 line-clamp-2 text-caption text-muted">{note.join(" ")}</p>
                      ) : null}
                      {c?.hide_price ? (
                        <p className="mt-1 text-caption text-muted">Price hidden from them</p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="inline-flex items-center rounded-pill bg-surface-sunk">
                          <button
                            aria-label="Decrease quantity"
                            onClick={() =>
                              item.quantity > 1
                                ? updateQuantity.mutate({ id: item.id, quantity: item.quantity - 1 })
                                : removeItem.mutate(item.id)
                            }
                            className="h-8 w-8 text-body"
                          >
                            −
                          </button>
                          <span className="min-w-6 text-center text-caption font-medium">{item.quantity}</span>
                          <button
                            aria-label="Increase quantity"
                            onClick={() =>
                              updateQuantity.mutate({ id: item.id, quantity: Math.min(999, item.quantity + 1) })
                            }
                            className="h-8 w-8 text-body"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem.mutate(item.id)}
                          className="text-caption text-muted underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-card bg-surface p-4 shadow-rest">
        <div className="flex justify-between text-body text-muted">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <div className="mt-1 flex justify-between text-body text-muted">
          <span>Delivery</span>
          <span>{formatMoney(DELIVERY_FEE)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-line pt-2 text-price">
          <span>Total</span>
          <span>{formatMoney(subtotal + DELIVERY_FEE)}</span>
        </div>
        <p className="mt-2 text-caption text-muted">Gift cards apply at checkout.</p>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => navigate("/checkout")}
            className="inline-flex h-[52px] w-full items-center justify-center rounded-pill bg-primary text-body font-medium text-inverse transition-all duration-fast active:scale-[0.98]"
          >
            Checkout — {formatMoney(subtotal + DELIVERY_FEE)}
          </button>
        </div>
      </div>
    </div>
  );
}
