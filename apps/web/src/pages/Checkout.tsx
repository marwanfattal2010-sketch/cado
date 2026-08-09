import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useAddresses, useCart, useCreateAddress, usePlaceOrder, type PaymentMethod } from "../hooks/useCart";
import { checkGiftCardBalance, normalizeGiftCardCode } from "../hooks/useGiftCards";
import { Chip } from "../components/ui";

const MESSAGES = ["Happy birthday!", "Congratulations!", "Thank you", "Get well soon"];

const PAYMENTS: { value: PaymentMethod; label: string; note?: string }[] = [
  // COD first and default: it's 60-70% of Lebanese e-commerce, and removing
  // it doesn't push people to cards, it loses the order.
  { value: "cod", label: "Cash on delivery", note: "Pay the driver when it arrives" },
  { value: "whish", label: "Whish Money", note: "Transfer to 81 900 002" },
  { value: "omt", label: "OMT" },
  { value: "card", label: "Card" },
];

const DELIVERY_FEE = 5;

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-2 font-display text-h2">
        <span className="text-muted">{n}</span> {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const FIELD =
  "w-full rounded-card border border-line bg-surface px-4 py-3 text-body outline-none focus:border-ink/35";

export function Checkout() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();
  const addresses = useAddresses();
  const createAddress = useCreateAddress();
  const placeOrder = usePlaceOrder();

  const [isGift, setIsGift] = useState(true);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [addressSource, setAddressSource] = useState<"buyer" | "recipient_whatsapp">("recipient_whatsapp");
  const [hidePrice, setHidePrice] = useState(true);
  const [message, setMessage] = useState("");
  const [slot, setSlot] = useState("Today, 4–7pm");
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [error, setError] = useState<string | null>(null);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [checkingCard, setCheckingCard] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    recipient_name: "",
    phone: "",
    city: "",
    area: "",
    street: "",
    building: "",
  });

  const items = cart.data ?? [];
  const subtotal = useMemo(
    () =>
      items.reduce((sum, i) => {
        const c = i.customization as { gift_wrap?: boolean } | null;
        const wrap = c?.gift_wrap ? i.product?.gift_wrap_price ?? 0 : 0;
        return sum + ((i.product?.price ?? 0) + wrap) * i.quantity;
      }, 0),
    [items]
  );
  const discount = giftCardBalance !== null ? Math.min(giftCardBalance, subtotal + DELIVERY_FEE) : 0;
  const total = Math.max(subtotal + DELIVERY_FEE - discount, 0);
  const savedAddress = addresses.data?.[0];

  const applyGiftCard = async (code: string) => {
    setGiftCardError(null);
    setGiftCardBalance(null);
    if (!code.trim()) return;
    setCheckingCard(true);
    try {
      const result = await checkGiftCardBalance(code);
      if (!result) setGiftCardError("That code isn't valid.");
      else setGiftCardBalance(result.remaining_balance);
    } catch (e) {
      // The server returns one generic message for every rejection reason.
      setGiftCardError(e instanceof Error ? e.message : "That code isn't valid.");
    } finally {
      setCheckingCard(false);
    }
  };

  // A card redeemed on the Redeem screen carries through to here.
  useEffect(() => {
    const saved = sessionStorage.getItem("cado-gift-card");
    if (!saved) return;
    try {
      const { code } = JSON.parse(saved) as { code: string };
      setGiftCardCode(code);
      void applyGiftCard(code);
    } catch {
      sessionStorage.removeItem("cado-gift-card");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-h1">Checkout</h1>
        <p className="mt-2 text-body text-muted">Log in to place your order.</p>
        <Link
          to="/login"
          className="mt-6 inline-flex h-[52px] items-center rounded-pill bg-ribbon px-8 text-body font-medium text-inverse"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-h1">Your cart is empty</h1>
        <Link
          to="/gift-finder"
          className="mt-6 inline-flex h-[52px] items-center rounded-pill bg-ribbon px-8 text-body font-medium text-inverse"
        >
          Find a gift
        </Link>
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    try {
      let addressId: string | null = savedAddress?.id ?? null;

      if (!isGift || addressSource === "buyer") {
        if (!addressId) {
          if (!addressForm.city.trim() || !addressForm.street.trim() || !addressForm.phone.trim()) {
            return setError("Add a delivery address so we know where to bring it.");
          }
          const created = await createAddress.mutateAsync(addressForm);
          addressId = (created as { id: string }).id;
        }
      }

      const orderId = await placeOrder.mutateAsync({
        deliveryAddressId: !isGift || addressSource === "buyer" ? addressId : null,
        addressSource: isGift ? addressSource : "buyer",
        isGift,
        recipientName: isGift ? recipientName.trim() : undefined,
        recipientPhone: isGift ? recipientPhone.trim() : undefined,
        hidePrice: isGift ? hidePrice : false,
        giftMessage: isGift ? message.trim() : undefined,
        deliverySlot: slot,
        paymentMethod: payment,
        giftCardCode: giftCardBalance !== null ? giftCardCode.trim() : undefined,
      });
      sessionStorage.removeItem("cado-gift-card");
      navigate(`/order-confirmed/${orderId}`, {
        state: { recipientName: isGift ? recipientName.trim() : "", paymentMethod: payment },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place the order");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-32">
      <h1 className="font-display text-h1">Checkout</h1>

      <Section n="①" title="Who's it for?">
        <div className="flex gap-2">
          <Chip active={!isGift} onClick={() => setIsGift(false)}>
            It's for me
          </Chip>
          <Chip active={isGift} onClick={() => setIsGift(true)}>
            It's a gift
          </Chip>
        </div>

        {isGift ? (
          <div className="mt-4 flex flex-col gap-3">
            <input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Their name"
              className={FIELD}
            />
            <input
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="Their phone (+961…)"
              inputMode="tel"
              className={FIELD}
            />

            {/* You rarely know a friend's exact address — so don't require it. */}
            <label className="flex cursor-pointer items-start gap-2.5 rounded-card bg-surface p-3 text-body shadow-rest">
              <input
                type="radio"
                name="addr"
                checked={addressSource === "recipient_whatsapp"}
                onChange={() => setAddressSource("recipient_whatsapp")}
                className="mt-1 h-4 w-4 accent-[color:var(--ribbon)]"
              />
              <span>
                Ask them for their address by WhatsApp
                <span className="mt-0.5 block text-caption text-muted">
                  We'll message {recipientName.trim() || "them"} for it. You don't need to know where they live.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-card bg-surface p-3 text-body shadow-rest">
              <input
                type="radio"
                name="addr"
                checked={addressSource === "buyer"}
                onChange={() => setAddressSource("buyer")}
                className="h-4 w-4 accent-[color:var(--ribbon)]"
              />
              I'll enter the address myself
            </label>

            <label className="flex cursor-pointer items-center gap-2.5 text-body">
              <input
                type="checkbox"
                checked={hidePrice}
                onChange={(e) => setHidePrice(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--ribbon)]"
              />
              Hide the price from them
            </label>

            <div>
              <p className="text-body font-medium">Your message</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {MESSAGES.map((m) => (
                  <Chip key={m} active={message === m} onClick={() => setMessage(m)} className="!h-8 !px-3 !text-caption">
                    {m}
                  </Chip>
                ))}
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Write your own..."
                className={`mt-2 resize-none ${FIELD}`}
              />
            </div>
          </div>
        ) : null}

        {(!isGift || addressSource === "buyer") && !savedAddress ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <input
              className={FIELD}
              placeholder="Phone"
              value={addressForm.phone}
              onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
            />
            <input
              className={FIELD}
              placeholder="City"
              value={addressForm.city}
              onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
            />
            <input
              className={FIELD}
              placeholder="Area"
              value={addressForm.area}
              onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
            />
            <input
              className={FIELD}
              placeholder="Recipient name"
              value={addressForm.recipient_name}
              onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
            />
            <input
              className={`col-span-2 ${FIELD}`}
              placeholder="Street / building"
              value={addressForm.street}
              onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
            />
          </div>
        ) : (!isGift || addressSource === "buyer") && savedAddress ? (
          <div className="mt-4 rounded-card bg-surface p-3 text-body shadow-rest">
            <p className="font-medium">{savedAddress.recipient_name}</p>
            <p className="text-muted">
              {savedAddress.street}, {savedAddress.area}, {savedAddress.city}
            </p>
          </div>
        ) : null}
      </Section>

      <Section n="②" title="When">
        <div className="flex flex-wrap gap-2">
          {["Today, 4–7pm", "Tomorrow", "Pick a date"].map((s) => (
            <Chip key={s} active={slot === s} onClick={() => setSlot(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </Section>

      <Section n="③" title="Payment">
        <div className="flex flex-col gap-2">
          {PAYMENTS.map((p) => (
            <label
              key={p.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-card bg-surface p-3 text-body shadow-rest"
            >
              <input
                type="radio"
                name="pay"
                checked={payment === p.value}
                onChange={() => setPayment(p.value)}
                className="h-4 w-4 accent-[color:var(--ribbon)]"
              />
              <span>
                {p.label}
                {p.note ? <span className="mt-0.5 block text-caption text-muted">{p.note}</span> : null}
              </span>
            </label>
          ))}
        </div>
        {/* Say what actually happens. Card isn't live yet, and pretending it
            is would take money we can't charge. */}
        {payment === "whish" || payment === "omt" ? (
          <p className="mt-3 rounded-card bg-surface-sunk px-3 py-2 text-caption text-muted">
            Place the order first, then send ${total.toFixed(0)}. We confirm the transfer before the store
            dispatches.
          </p>
        ) : payment === "card" ? (
          <p className="mt-3 rounded-card bg-surface-sunk px-3 py-2 text-caption text-muted">
            Card payments aren't live yet. Place the order and we'll call you with a payment link, or switch
            to cash on delivery.
          </p>
        ) : null}
      </Section>

      <Section n="④" title="Gift card">
        <div className="flex gap-2">
          <input
            className={`${FIELD} uppercase tracking-wider`}
            placeholder="XXXX-XXXX-XXXX"
            value={giftCardCode}
            onChange={(e) => {
              setGiftCardCode(normalizeGiftCardCode(e.target.value));
              setGiftCardBalance(null);
              setGiftCardError(null);
            }}
          />
          <button
            onClick={() => applyGiftCard(giftCardCode)}
            disabled={checkingCard || !giftCardCode.trim()}
            className="shrink-0 rounded-card border border-line px-5 text-body font-medium disabled:opacity-40"
          >
            {checkingCard ? "Checking…" : "Apply"}
          </button>
        </div>
        {giftCardError ? <p className="mt-2 text-caption text-alert">{giftCardError}</p> : null}
        {giftCardBalance !== null ? (
          <p className="mt-2 text-caption text-today">
            Applied — ${giftCardBalance.toFixed(2)} available on this card
          </p>
        ) : null}
      </Section>

      <div className="mt-6 rounded-card bg-surface p-4 shadow-rest">
        <div className="flex justify-between text-body text-muted">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(0)}</span>
        </div>
        <div className="mt-1 flex justify-between text-body text-muted">
          <span>Delivery</span>
          <span>${DELIVERY_FEE.toFixed(0)}</span>
        </div>
        {discount > 0 ? (
          <div className="mt-1 flex justify-between text-body text-today">
            <span>Gift card</span>
            <span>−${discount.toFixed(0)}</span>
          </div>
        ) : null}
        <div className="mt-2 flex justify-between border-t border-line pt-2 text-price">
          <span>Total</span>
          <span>${total.toFixed(0)}</span>
        </div>
      </div>

      <p className="mt-4 text-caption text-muted">
        We confirm every order with the store before dispatch. If something's unavailable we'll call you with
        options, or refund immediately.
      </p>

      {/* Buyers abandon gifting checkouts out of fear they'll send it to
          themselves — so say plainly where it's going. */}
      {isGift && recipientName.trim() ? (
        <p className="mt-3 rounded-card bg-today-tint px-3 py-2 text-caption font-medium text-today">
          Delivering to {recipientName.trim()}, not to you.
        </p>
      ) : null}

      {error ? <p className="mt-4 text-body text-alert">{error}</p> : null}

      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <button
            onClick={submit}
            disabled={placeOrder.isPending}
            className="inline-flex h-[52px] w-full items-center justify-center rounded-pill bg-ribbon text-body font-medium text-inverse transition-all duration-fast active:scale-[0.98] disabled:opacity-40"
          >
            {placeOrder.isPending ? "Placing order…" : `Place order — $${total.toFixed(0)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
