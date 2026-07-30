import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

export function Cart() {
  const { session } = useAuth();
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

  const groupedByPartner = useMemo(() => {
    if (!cart.data) return [];
    const groups = new Map<string, { partnerName: string; items: typeof cart.data }>();
    for (const item of cart.data) {
      const partnerId = item.product?.partner?.id ?? "unknown";
      const partnerName = item.product?.partner?.name ?? "Store";
      if (!groups.has(partnerId)) groups.set(partnerId, { partnerName, items: [] });
      groups.get(partnerId)!.items.push(item);
    }
    return Array.from(groups.values());
  }, [cart.data]);

  const subtotal = useMemo(() => {
    if (!cart.data) return 0;
    return cart.data.reduce((sum, item) => {
      const customization = item.customization as { gift_wrap?: boolean } | null;
      const wrap = customization?.gift_wrap ? item.product?.gift_wrap_price ?? 0 : 0;
      return sum + ((item.product?.price ?? 0) + wrap) * item.quantity;
    }, 0);
  }, [cart.data]);

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

  const onPlaceOrder = async () => {
    if (!defaultAddress) return;
    setError(null);
    setPlacing(true);
    try {
      const orderId = await placeOrder.mutateAsync({ deliveryAddressId: defaultAddress.id, notes: orderNotes });
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

      {!cart.data || cart.data.length === 0 ? (
        <p className="mt-8 text-ink/50">
          Your cart is empty.{" "}
          <Link to="/browse" className="font-medium text-ink">
            Browse gifts
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

          <div className="mt-10 flex items-center justify-between border-t border-ink/10 pt-6 text-lg">
            <span>Subtotal</span>
            <span>USD {subtotal.toFixed(2)}</span>
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
            {placing ? "Placing order..." : "Place order — Cash on Delivery"}
          </button>
        </>
      )}
    </div>
  );
}
