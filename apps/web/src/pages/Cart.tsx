import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { primaryImage } from "../lib/images";
import {
  useAddresses,
  useCart,
  useCreateAddress,
  usePlaceOrder,
  useRemoveCartItem,
  useUpdateCartQuantity,
} from "../hooks/useCart";
import { checkGiftCardBalance } from "../hooks/useGiftCards";

const WHISH_NUMBER = "81 900 002";

export function Cart() {
  const { session } = useAuth();
  const [params] = useSearchParams();
  // Opening the cart from inside a store shows only that store's items.
  const storeFilter = params.get("store");
  const cart = useCart();
  const addresses = useAddresses();
  const removeItem = useRemoveCartItem();
  const updateQuantity = useUpdateCartQuantity();
  const createAddress = useCreateAddress();
  const placeOrder = usePlaceOrder();

  const [addressForm, setAddressForm] = useState({
    label: "Home",
    recipient_name: "",
    phone: "",
    city: "",
    area: "",
    street: "",
    building: "",
  });
  const [orderNotes, setOrderNotes] = useState("");
  const [placedOrder, setPlacedOrder] = useState<{ id: string; number: string } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [checkingGiftCard, setCheckingGiftCard] = useState(false);
  const [payment, setPayment] = useState<"cod" | "whish">("cod");
  const DELIVERY_FEE = 5;

  const visibleItems = useMemo(() => {
    if (!cart.data) return [];
    if (!storeFilter) return cart.data;
    return cart.data.filter((i) => i.product?.partner?.id === storeFilter);
  }, [cart.data, storeFilter]);

  const groupedByPartner = useMemo(() => {
    const groups = new Map<string, { partnerName: string; items: typeof visibleItems }>();
    for (const item of visibleItems) {
      const partnerId = item.product?.partner?.id ?? "unknown";
      const partnerName = item.product?.partner?.name ?? "Store";
      if (!groups.has(partnerId)) groups.set(partnerId, { partnerName, items: [] });
      groups.get(partnerId)!.items.push(item);
    }
    return Array.from(groups.values());
  }, [visibleItems]);

  const subtotal = useMemo(() => {
    return visibleItems.reduce((sum, item) => {
      const customization = item.customization as { gift_wrap?: boolean } | null;
      const wrap = customization?.gift_wrap ? item.product?.gift_wrap_price ?? 0 : 0;
      return sum + ((item.product?.price ?? 0) + wrap) * item.quantity;
    }, 0);
  }, [visibleItems]);

  const applyGiftCard = async (code: string) => {
    setGiftCardError(null);
    setGiftCardBalance(null);
    if (!code.trim()) return;
    setCheckingGiftCard(true);
    try {
      const result = await checkGiftCardBalance(code);
      if (!result) {
        setGiftCardError("That code isn't valid.");
      } else {
        setGiftCardBalance(result.remaining_balance);
      }
    } catch (e) {
      // The server returns the same generic message for every rejection reason.
      setGiftCardError(e instanceof Error ? e.message : "That code isn't valid.");
    } finally {
      setCheckingGiftCard(false);
    }
  };

  // A card redeemed on the Redeem screen is applied here automatically. This
  // (and every other hook) must stay above the early returns below — hooks
  // that only run on some renders violate React's Rules of Hooks and can
  // crash the whole page once the session finishes loading.
  useEffect(() => {
    const saved = sessionStorage.getItem("cado-gift-card");
    if (saved && !giftCardCode) {
      try {
        const { code } = JSON.parse(saved) as { code: string };
        setGiftCardCode(code);
        void applyGiftCard(code);
      } catch {
        sessionStorage.removeItem("cado-gift-card");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Your cart</h1>
        <p className="mt-4 text-ink/60">Log in to see your cart.</p>
        <Link to="/login" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm text-cream">
          Log in
        </Link>
      </div>
    );
  }

  if (placedOrder) {
    const steps = ["Order placed", "Store is preparing it", "Out for delivery", "Delivered"];
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ink text-cream">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold">Order placed</h1>
        <p className="mt-1 text-sm text-ink/50">#{placedOrder.number}</p>

        <div className="mt-8 rounded-3xl bg-white p-6 text-left ring-1 ring-ink/8">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-3 py-2">
              <div className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-ink" : "bg-ink/15"}`} />
              <span className={`text-sm ${i === 0 ? "font-medium text-ink" : "text-ink/40"}`}>{step}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-ink/60">
          {payment === "whish"
            ? `We'll confirm as soon as your Whish transfer arrives, then get it moving.`
            : "Pay the driver when your gift arrives. We'll text you as each store confirms."}
        </p>

        <Link to="/orders" className="mt-8 inline-block w-full rounded-full bg-ink px-6 py-3 text-sm text-cream">
          Track this order
        </Link>
        <Link to="/" className="mt-3 inline-block text-sm text-ink/50 underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  const defaultAddress = addresses.data?.[0];

  const onCreateAddress = async () => {
    setError(null);
    try {
      await createAddress.mutateAsync(addressForm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save address");
    }
  };

  const onApplyGiftCard = () => applyGiftCard(giftCardCode);

  const discount = giftCardBalance !== null ? Math.min(giftCardBalance, subtotal + DELIVERY_FEE) : 0;
  const total = Math.max(subtotal + DELIVERY_FEE - discount, 0);

  const onPlaceOrder = async () => {
    if (!defaultAddress) return;
    setError(null);
    setPlacing(true);
    try {
      const orderId = await placeOrder.mutateAsync({
        deliveryAddressId: defaultAddress.id,
        notes: orderNotes,
        giftCardCode: giftCardBalance !== null ? giftCardCode.trim() : undefined,
        paymentMethod: payment,
      });
      sessionStorage.removeItem("cado-gift-card");
      const { data } = await supabase.from("orders").select("order_number").eq("id", orderId).single();
      setPlacedOrder({ id: orderId, number: data?.order_number ?? orderId.slice(0, 8).toUpperCase() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-3xl">Your cart</h1>

      {storeFilter ? (
        <Link to="/cart" className="mt-1 inline-block text-sm text-ink/50 underline">
          See items from all stores
        </Link>
      ) : null}

      {visibleItems.length === 0 ? (
        <p className="mt-8 text-ink/50">
          {storeFilter ? "Nothing from this store yet." : "Your cart is empty."}{" "}
          <Link to="/" className="font-medium text-ink">
            Find a gift
          </Link>
        </p>
      ) : (
        <>
          <div className="mt-8 space-y-8">
            {groupedByPartner.map((group) => (
              <div key={group.partnerName}>
                <p className="mb-3 text-sm font-semibold tracking-wide text-ink/50">{group.partnerName}</p>
                <div className="space-y-4">
                  {group.items.map((item) => {
                    const uri = primaryImage(item.product?.product_images);
                    return (
                      <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-ink/10 p-4">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-ink/5">
                          {uri ? <img src={uri} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.product?.title}</p>
                          <p className="text-sm text-ink/50">
                            {item.product?.currency} {item.product?.price.toFixed(2)}
                          </p>
                          {(() => {
                            // Confirm any note back to the buyer, so they can
                            // see what will actually be written on the card.
                            const c = item.customization as
                              | { message?: string; note_to?: string; note_from?: string }
                              | null;
                            if (!c?.message && !c?.note_to && !c?.note_from) return null;
                            const parts = [
                              c.note_to ? `To ${c.note_to}` : null,
                              c.message ? `"${c.message}"` : null,
                              c.note_from ? `— ${c.note_from}` : null,
                            ].filter(Boolean);
                            return <p className="mt-1 line-clamp-2 text-xs text-ink/45">{parts.join(" ")}</p>;
                          })()}
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity.mutate({
                              id: item.id,
                              quantity: Math.min(999, Math.max(1, Number(e.target.value))),
                            })
                          }
                          className="w-16 rounded-lg border border-ink/15 px-2 py-1 text-center text-sm"
                        />
                        <button
                          onClick={() => removeItem.mutate(item.id)}
                          className="text-sm text-ink/40 hover:text-ink"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-ink/10 pt-6">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink/50">GIFT CARD</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="flex-[2] rounded-xl border border-ink/15 px-4 py-3 text-sm uppercase tracking-wider"
                placeholder="Gift card code"
                value={giftCardCode}
                onChange={(e) => {
                  setGiftCardCode(e.target.value.trim().toUpperCase());
                  setGiftCardBalance(null);
                  setGiftCardError(null);
                }}
              />
              <button
                onClick={onApplyGiftCard}
                disabled={checkingGiftCard || !giftCardCode.trim()}
                className="rounded-xl border border-ink/20 px-5 py-3 text-sm font-medium disabled:opacity-40 sm:py-0"
              >
                {checkingGiftCard ? "Checking..." : "Apply"}
              </button>
            </div>
            {giftCardError ? <p className="mt-2 text-sm text-red-600">{giftCardError}</p> : null}
            {giftCardBalance !== null ? (
              <p className="mt-2 text-sm text-emerald-700">
                Applied — USD {giftCardBalance.toFixed(2)} available on this card
              </p>
            ) : null}
          </div>

          <div className="mt-6 space-y-1 border-t border-ink/10 pt-6">
            <div className="flex items-center justify-between text-ink/60">
              <span>Subtotal</span>
              <span>USD {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-ink/60">
              <span>Delivery</span>
              <span>USD {DELIVERY_FEE.toFixed(2)}</span>
            </div>
            {discount > 0 ? (
              <div className="flex items-center justify-between text-emerald-700">
                <span>Gift card</span>
                <span>-USD {discount.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between text-lg font-medium">
              <span>Total</span>
              <span>USD {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-10">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink/50">DELIVERY ADDRESS</h2>
            {defaultAddress ? (
              <div className="rounded-2xl border border-ink/10 p-4 text-sm">
                <p className="font-medium">{defaultAddress.recipient_name}</p>
                <p className="text-ink/60">
                  {defaultAddress.street}, {defaultAddress.area}, {defaultAddress.city}
                </p>
                <p className="text-ink/60">{defaultAddress.phone}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="rounded-xl border border-ink/15 px-4 py-3 text-sm"
                    placeholder="Recipient name"
                    value={addressForm.recipient_name}
                    onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
                  />
                  <input
                    className="rounded-xl border border-ink/15 px-4 py-3 text-sm"
                    placeholder="Phone"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  />
                  <input
                    className="rounded-xl border border-ink/15 px-4 py-3 text-sm"
                    placeholder="City"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  />
                  <input
                    className="rounded-xl border border-ink/15 px-4 py-3 text-sm"
                    placeholder="Area"
                    value={addressForm.area}
                    onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                  />
                  <input
                    className="col-span-2 rounded-xl border border-ink/15 px-4 py-3 text-sm"
                    placeholder="Street / building"
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                  />
                </div>
                <button
                  onClick={onCreateAddress}
                  disabled={createAddress.isPending}
                  className="rounded-full border border-ink/20 px-5 py-2 text-sm"
                >
                  {createAddress.isPending ? "Saving..." : "Save address"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-10">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink/50">PAYMENT</h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setPayment("cod")}
                className={`rounded-2xl p-4 text-left transition ${
                  payment === "cod" ? "bg-ink text-cream" : "bg-white ring-1 ring-ink/8"
                }`}
              >
                <p className="text-sm font-semibold">Cash on delivery</p>
                <p className={`mt-0.5 text-xs ${payment === "cod" ? "text-cream/60" : "text-ink/50"}`}>
                  Pay the driver when your gift arrives.
                </p>
              </button>
              <button
                onClick={() => setPayment("whish")}
                className={`rounded-2xl p-4 text-left transition ${
                  payment === "whish" ? "bg-ink text-cream" : "bg-white ring-1 ring-ink/8"
                }`}
              >
                <p className="text-sm font-semibold">Whish transfer</p>
                <p className={`mt-0.5 text-xs ${payment === "whish" ? "text-cream/60" : "text-ink/50"}`}>
                  Send the amount to {WHISH_NUMBER} before delivery.
                </p>
              </button>
            </div>
            {payment === "whish" ? (
              <div className="mt-3 rounded-2xl bg-gold/12 p-4 text-sm">
                <p className="font-medium">Send USD {total.toFixed(2)} by Whish to:</p>
                <p className="mt-1 font-display text-xl font-semibold tracking-wide">{WHISH_NUMBER}</p>
                <p className="mt-2 text-xs text-ink/55">
                  Place the order first, then send the transfer. We confirm before delivering.
                </p>
              </div>
            ) : null}
          </div>

          <textarea
            className="mt-6 w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            placeholder="Order notes (optional)"
            rows={2}
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
          />

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

          <button
            onClick={onPlaceOrder}
            disabled={!defaultAddress || placing}
            className="mt-6 w-full rounded-full bg-ink py-3 text-sm tracking-wide text-cream disabled:opacity-40"
          >
            {placing
              ? "Placing order..."
              : total <= 0
                ? "Place order — fully covered by gift card"
                : payment === "whish"
                  ? `Place order — USD ${total.toFixed(2)} by Whish`
                  : `Place order — USD ${total.toFixed(2)} on delivery`}
          </button>
        </>
      )}
    </div>
  );
}
