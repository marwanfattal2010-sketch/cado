import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { primaryImage } from "../lib/images";
import {
  useAddresses,
  useCart,
  useCreateAddress,
  usePlaceOrder,
  useRemoveCartItem,
  useUpdateCartQuantity,
} from "../hooks/useCart";
import { checkGiftCard } from "../hooks/useGiftCards";

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
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [checkingGiftCard, setCheckingGiftCard] = useState(false);
  const [payment, setPayment] = useState<"cod" | "whish">("cod");

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

  if (placedOrderId) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Order placed</h1>
        <p className="mt-4 text-ink/60">
          Your order has been placed for Cash on Delivery. We'll notify you as each store confirms.
        </p>
        <Link to="/" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm text-cream">
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

  const applyGiftCard = async (code: string) => {
    setGiftCardError(null);
    setGiftCardBalance(null);
    if (!code.trim()) return;
    setCheckingGiftCard(true);
    try {
      const result = await checkGiftCard(code);
      if (!result?.valid) {
        setGiftCardError("That code isn't valid or has no balance left");
      } else {
        setGiftCardBalance(result.remaining_balance);
      }
    } catch (e) {
      setGiftCardError(e instanceof Error ? e.message : "Could not check gift card");
    } finally {
      setCheckingGiftCard(false);
    }
  };

  const onApplyGiftCard = () => applyGiftCard(giftCardCode);

  // A card redeemed on the Redeem screen is applied here automatically.
  useEffect(() => {
    const saved = localStorage.getItem("cado-gift-card");
    if (saved && !giftCardCode) {
      setGiftCardCode(saved);
      void applyGiftCard(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const discount = giftCardBalance !== null ? Math.min(giftCardBalance, subtotal) : 0;
  const total = Math.max(subtotal - discount, 0);

  const onPlaceOrder = async () => {
    if (!defaultAddress) return;
    setError(null);
    setPlacing(true);
    try {
      const paymentNote = payment === "whish" ? "[Paying by Whish transfer] " : "";
      const orderId = await placeOrder.mutateAsync({
        deliveryAddressId: defaultAddress.id,
        notes: paymentNote + orderNotes,
        giftCardCode: giftCardBalance !== null ? giftCardCode.trim() : undefined,
      });
      localStorage.removeItem("cado-gift-card");
      setPlacedOrderId(orderId);
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
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity.mutate({ id: item.id, quantity: Math.max(1, Number(e.target.value)) })
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
            <div className="flex gap-3">
              <input
                className="flex-1 rounded-xl border border-ink/15 px-4 py-3 text-center text-sm tracking-[0.3em]"
                placeholder="000000"
                inputMode="numeric"
                value={giftCardCode}
                onChange={(e) => {
                  setGiftCardCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setGiftCardBalance(null);
                  setGiftCardError(null);
                }}
              />
              <button
                onClick={onApplyGiftCard}
                disabled={checkingGiftCard || !giftCardCode.trim()}
                className="rounded-xl border border-ink/20 px-5 text-sm font-medium disabled:opacity-40"
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
