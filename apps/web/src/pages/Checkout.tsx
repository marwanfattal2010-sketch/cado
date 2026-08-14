import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useAddresses, useCart, useCreateAddress, usePlaceOrder, type PaymentMethod } from "../hooks/useCart";
import { checkGiftCardBalance, normalizeGiftCardCode } from "../hooks/useGiftCards";
import { CUTOFF_LABEL, getArea, getAddressDetails, sameDayOpen } from "../lib/area";
import { useCadoHours, closedLabel } from "../hooks/useCadoHours";
import { formatMoney } from "../lib/money";

const PAYMENTS: { value: PaymentMethod; label: string; note: string }[] = [
  // COD first and default: it's 60-70% of Lebanese e-commerce, and removing
  // it doesn't push people to cards, it loses the order.
  { value: "cod", label: "Cash on delivery", note: "Pay the driver when it arrives" },
  { value: "whish", label: "Whish Money", note: "Transfer to 81 900 002 after ordering" },
  { value: "omt", label: "OMT", note: "Transfer at any OMT branch after ordering" },
  { value: "card", label: "Card", note: "Not live yet — we'll call you with a link" },
];

const DELIVERY_FEE = 5;

/**
 * Three steps and a total. Nothing else belongs on this page.
 *
 * The old version had four numbered sections plus a "Who's it for?" chip
 * pair, and asked twice for things the product page had already collected —
 * the gift message and hide-price were per item, then asked again per order.
 */
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

/** A label above a field, so nothing depends on a placeholder that vanishes
 *  the moment you start typing. */
function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "tel" | "text";
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-caption text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className={FIELD}
      />
    </label>
  );
}

export function Checkout() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();
  const addresses = useAddresses();
  const createAddress = useCreateAddress();
  const placeOrder = usePlaceOrder();
  const [params] = useSearchParams();

  const [isGift, setIsGift] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("cod");
  const [error, setError] = useState<string | null>(null);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardError, setGiftCardError] = useState<string | null>(null);
  const [giftCardOpen, setGiftCardOpen] = useState(false);
  const [checkingCard, setCheckingCard] = useState(false);

  /**
   * WHEN. There is no date picker any more, and no "pick a date".
   *
   * CADO has one opening window for every store, decided in Postgres in
   * Beirut time (app_settings, migration 0045). While it is open, "Now" is
   * the only honest answer — there is nothing else to offer. While it is
   * closed, everything is a preorder and the earliest moment we can promise
   * is the next opening time, so that is where the picker starts.
   *
   * The device clock is never the authority here: `place_order` rejects a
   * "Now" order placed outside the window whatever the browser believed.
   * Until 0045 is applied the window is unknown, and the old same-day rule
   * in lib/area stands in — it is stricter, never looser.
   */
  const hours = useCadoHours();
  const hoursWindow = hours.data ?? { known: false as const };
  const isOpenNow = hoursWindow.known ? hoursWindow.isOpen : sameDayOpen();
  const nextOpen = hoursWindow.known ? hoursWindow.nextOpenAt : null;

  const [when, setWhen] = useState<"now" | "preorder">("now");
  const [preorderAt, setPreorderAt] = useState("");

  // Whenever the window closes under the shopper — they left the page open
  // past 9pm — "Now" stops being offered and this follows it.
  useEffect(() => {
    if (!isOpenNow) setWhen("preorder");
  }, [isOpenNow]);

  /**
   * The earliest bookable moment, in the format datetime-local wants
   * (yyyy-MM-ddTHH:mm) and in LOCAL time — toISOString() would shift it by
   * the timezone offset and offer a slot before we open.
   */
  const earliestSlot = useMemo(() => {
    const d = nextOpen ? new Date(nextOpen) : new Date(Date.now() + 60 * 60 * 1000);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [nextOpen]);

  /** Whether to offer the saved address or the typed form. Repeat orders
   *  should be two taps, so a saved address wins by default. */
  const [useSaved, setUseSaved] = useState(true);
  // Prefilled from the header's area picker (city + any street details the
  // shopper saved there), so they don't retype an address they already gave.
  const [addressForm, setAddressForm] = useState(() => {
    const saved = getAddressDetails();
    return {
      label: "Home",
      recipient_name: "",
      phone: "",
      city: getArea() as string,
      area: "",
      street: saved.street,
      building: saved.building,
      floor: saved.floor,
      apartment: saved.apartment,
      notes: saved.notes,
    };
  });

  /**
   * Checkout is per store. `?store=<partner id>` scopes this page to one
   * cart, and the same id is handed to place_order so the server orders and
   * empties that store only — the shopper's other carts are untouched and
   * still there when they come back.
   *
   * Without the parameter this behaves exactly as it always did, which keeps
   * any older link or bookmark working.
   */
  const storeFilter = params.get("store");
  const items = useMemo(() => {
    const all = cart.data ?? [];
    return storeFilter ? all.filter((i) => i.product?.partner?.id === storeFilter) : all;
  }, [cart.data, storeFilter]);

  // Price times quantity. No wrap surcharge — CADO does not wrap, and a line
  // the server will not charge must never appear in a client total.
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0),
    [items]
  );
  const discount = giftCardBalance !== null ? Math.min(giftCardBalance, subtotal + DELIVERY_FEE) : 0;
  const total = Math.max(subtotal + DELIVERY_FEE - discount, 0);
  const savedAddress = addresses.data?.[0];
  // Going straight to the recipient means their address, so the saved one is
  // not offered — it is the wrong address by definition.
  const showSaved = !!savedAddress && useSaved && !isGift;

  /**
   * Cash on delivery disappears when the gift goes straight to the person
   * receiving it. Asking someone to pay for their own present at the door is
   * the one thing this option must never do.
   *
   * Whish and OMT stay: both are manual transfers the buyer makes before
   * delivery, which is exactly how gift cards are already paid for.
   */
  const payments = useMemo(() => PAYMENTS.filter((p) => !(isGift && p.value === "cod")), [isGift]);

  useEffect(() => {
    // If they had already chosen cash and then switched the destination, move
    // them off it rather than silently sending an order we would refuse.
    if (isGift && payment === "cod") setPayment("whish");
  }, [isGift, payment]);

  /**
   * The gift choices made per item on the product page, summarised for the
   * order. Nothing here is a question — checkout must not ask again for
   * something already answered, so these are derived, not typed.
   *
   * place_order takes one order-level message and one hide-price flag, while
   * the per-item copies ride along in cart_items.customization and land on
   * the order_item untouched.
   */
  /**
   * When "this is a gift" is on, the one name and phone on the form ARE the
   * recipient's — that is what the toggle changes. There is no second pair of
   * fields, because asking for both the buyer's and the recipient's details
   * is what made the old step long enough to abandon.
   */
  const recipientName = showSaved ? (savedAddress?.recipient_name ?? "") : addressForm.recipient_name;
  const recipientPhone = showSaved ? (savedAddress?.phone ?? "") : addressForm.phone;

  const giftNotes = useMemo(() => {
    const messages: string[] = [];
    let anyHidden = false;
    for (const i of items) {
      const c = i.customization as { message?: string; hide_price?: boolean } | null;
      if (c?.message?.trim()) messages.push(c.message.trim());
      if (c?.hide_price) anyHidden = true;
    }
    return { messages, anyHidden };
  }, [items]);

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
          className="mt-6 inline-flex h-[52px] items-center rounded-pill bg-primary px-8 text-body font-medium text-inverse"
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
          className="mt-6 inline-flex h-[52px] items-center rounded-pill bg-primary px-8 text-body font-medium text-inverse"
        >
          Browse gifts
        </Link>
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    try {
      let addressId: string | null = showSaved ? savedAddress!.id : null;

      if (!addressId) {
        if (
          !addressForm.recipient_name.trim() ||
          !addressForm.phone.trim() ||
          !addressForm.city.trim() ||
          !addressForm.street.trim()
        ) {
          return setError("Fill in the name, phone, city and street so we know where to bring it.");
        }
        const created = await createAddress.mutateAsync(addressForm);
        addressId = (created as { id: string }).id;
      }

      if (when === "preorder" && !preorderAt) {
        return setError("Choose when we should bring it.");
      }

      const orderId = await placeOrder.mutateAsync({
        deliveryAddressId: addressId,
        // Always "buyer" now: the address is typed or saved, never fetched
        // from the recipient. The WhatsApp path is gone from the UI.
        addressSource: "buyer",
        isGift,
        recipientName: isGift ? recipientName.trim() : undefined,
        recipientPhone: isGift ? recipientPhone.trim() : undefined,
        // Both derived from what was chosen per item on the product page.
        hidePrice: giftNotes.anyHidden,
        giftMessage: giftNotes.messages[0],
        // "Now" is the exact word the server-side window check looks for.
        deliverySlot: when === "now" ? "Now" : `Preorder ${preorderAt}`,
        paymentMethod: payment,
        giftCardCode: giftCardBalance !== null ? giftCardCode.trim() : undefined,
        partnerId: storeFilter,
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

      <Section n="①" title="Delivery address">
        {/* One question, not a checkbox with a sentence hanging off it. It
            changes what every field below means, so it is asked plainly and
            first. */}
        <p className="mb-2 text-body font-medium">Where should it go?</p>
        <div className="mb-3 flex flex-col gap-2">
          <label className="flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-card border border-line bg-surface px-3 text-body">
            <input
              type="radio"
              name="destination"
              checked={!isGift}
              onChange={() => setIsGift(false)}
              className="h-4 w-4 shrink-0 accent-[color:rgb(var(--persimmon))]"
            />
            <span>
              To me
              <span className="mt-0.5 block text-caption text-muted">
                We deliver it to your address and you hand it over.
              </span>
            </span>
          </label>
          <label className="flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-card border border-line bg-surface px-3 text-body">
            <input
              type="radio"
              name="destination"
              checked={isGift}
              onChange={() => setIsGift(true)}
              className="h-4 w-4 shrink-0 accent-[color:rgb(var(--persimmon))]"
            />
            <span>
              Straight to them
              <span className="mt-0.5 block text-caption text-muted">
                We deliver it to the person receiving the gift.
              </span>
            </span>
          </label>
        </div>

        {showSaved ? (
          /* A repeat order is two taps: this, then Place order. */
          <div className="mt-3 rounded-card border border-line bg-surface p-3">
            <p className="text-body font-medium">{savedAddress!.recipient_name}</p>
            <p className="text-caption text-muted">
              {[savedAddress!.street, savedAddress!.area, savedAddress!.city].filter(Boolean).join(", ")}
            </p>
            {savedAddress!.phone ? (
              <p className="text-caption text-muted">{savedAddress!.phone}</p>
            ) : null}
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex h-11 items-center rounded-pill bg-primary px-5 text-caption font-medium text-inverse">
                Deliver here
              </span>
              <button
                type="button"
                onClick={() => setUseSaved(false)}
                className="tap-44 text-caption font-medium text-muted underline underline-offset-4 hover:text-ink"
              >
                New address
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field
              label={isGift ? "Their full name" : "Full name"}
              className="col-span-2"
              value={addressForm.recipient_name}
              onChange={(v) => setAddressForm({ ...addressForm, recipient_name: v })}
            />
            <Field
              label={isGift ? "Their phone" : "Phone"}
              className="col-span-2"
              placeholder="+961…"
              inputMode="tel"
              value={addressForm.phone}
              onChange={(v) => setAddressForm({ ...addressForm, phone: v })}
            />
            <Field
              label="City"
              value={addressForm.city}
              onChange={(v) => setAddressForm({ ...addressForm, city: v })}
            />
            <Field
              label="Area"
              value={addressForm.area}
              onChange={(v) => setAddressForm({ ...addressForm, area: v })}
            />
            <Field
              label="Street"
              value={addressForm.street}
              onChange={(v) => setAddressForm({ ...addressForm, street: v })}
            />
            <Field
              label="Building"
              value={addressForm.building}
              onChange={(v) => setAddressForm({ ...addressForm, building: v })}
            />
            <Field
              label="Floor / extra directions (optional)"
              className="col-span-2"
              value={addressForm.notes}
              onChange={(v) => setAddressForm({ ...addressForm, notes: v })}
            />
            {savedAddress ? (
              <button
                type="button"
                onClick={() => setUseSaved(true)}
                className="tap-44 col-span-2 justify-self-start text-caption font-medium text-muted underline underline-offset-4 hover:text-ink"
              >
                Use my saved address
              </button>
            ) : null}
          </div>
        )}
      </Section>

      <Section n="②" title="When">
        <div className="flex flex-col gap-2">
          {/* "Now" disappears entirely outside the same-day window rather
              than sitting there disabled — an option you cannot pick is a
              question you should not have been asked. */}
          {/* While CADO is open, Now is the only option — so it is the only
              thing on screen, not a radio pair with one dead half. */}
          {isOpenNow ? (
            <div className="flex min-h-[52px] items-center gap-2.5 rounded-card border border-persimmon bg-surface px-3 text-body">
              <span aria-hidden className="text-persimmon">
                ●
              </span>
              <span>
                Now
                <span className="mt-0.5 block text-caption text-muted">
                  Today, if you order before {CUTOFF_LABEL}
                </span>
              </span>
            </div>
          ) : (
            <>
              <div className="flex min-h-[52px] items-center gap-2.5 rounded-card border border-line bg-surface-sunk px-3 text-body text-muted">
                {closedLabel(hoursWindow) ?? "Closed right now — this will be a preorder."}
              </div>
              <label className="mt-1 block">
                <span className="mb-1 block text-caption text-muted">Preorder for</span>
                <input
                  type="datetime-local"
                  min={earliestSlot}
                  value={preorderAt}
                  onChange={(e) => setPreorderAt(e.target.value)}
                  className={FIELD}
                />
              </label>
            </>
          )}
        </div>
      </Section>

      <Section n="③" title="Payment">
        <div className="flex flex-col gap-2">
          {/* Plain rows on a hairline, not raised cards. Four shadowed
              panels in a column read as four separate things to decide. */}
          {payments.map((p) => (
            <label
              key={p.value}
              className="flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-card border border-line bg-surface px-3 py-2 text-body"
            >
              <input
                type="radio"
                name="pay"
                checked={payment === p.value}
                onChange={() => setPayment(p.value)}
                className="h-4 w-4 shrink-0 accent-[color:rgb(var(--primary))]"
              />
              <span>
                {p.label}
                <span className="mt-0.5 block text-caption text-muted">{p.note}</span>
              </span>
            </label>
          ))}
        </div>
        {/* Say what actually happens. Card isn't live yet, and pretending it
            is would take money we can't charge. */}
        {payment === "whish" || payment === "omt" ? (
          <p className="mt-3 rounded-card bg-surface-sunk px-3 py-2 text-caption text-muted">
            Place the order first, then send {formatMoney(total)}. We confirm the transfer before the store
            dispatches.
          </p>
        ) : payment === "card" ? (
          <p className="mt-3 rounded-card bg-surface-sunk px-3 py-2 text-caption text-muted">
            Card payments aren't live yet. Place the order and we'll call you with a payment link, or switch
            to cash on delivery.
          </p>
        ) : null}
      </Section>

      {/* What was already chosen on the product page, shown back rather than
          asked again. This is a summary, not a form — the note and the
          hide-price flag travel with the item in cart_items.customization. */}
      {giftNotes.messages.length > 0 || giftNotes.anyHidden ? (
        <div className="mt-6 rounded-card border border-line px-3 py-2.5">
          {giftNotes.messages.map((m, i) => (
            <p key={i} className="text-caption text-muted">
              Note on your gift: “{m}”
            </p>
          ))}
          {giftNotes.anyHidden ? (
            <p className="text-caption text-muted">Price hidden from them.</p>
          ) : null}
          <Link
            to="/cart"
            className="tap-44 mt-1 inline-block text-caption font-medium text-ink underline underline-offset-4"
          >
            Change in cart
          </Link>
        </div>
      ) : null}

      {/* Not a fourth step. Most people do not have a gift card, and giving
          the code field a number of its own made it look like something
          everyone had to deal with. All the redemption logic is unchanged. */}
      <div className="mt-6">
        {!giftCardOpen && giftCardBalance === null ? (
          <button
            type="button"
            onClick={() => setGiftCardOpen(true)}
            className="tap-44 text-caption font-medium text-muted underline underline-offset-4 hover:text-ink"
          >
            Have a gift card?
          </button>
        ) : (
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
        )}
        {giftCardError ? <p className="mt-2 text-caption text-alert">{giftCardError}</p> : null}
        {giftCardBalance !== null ? (
          <p className="mt-2 text-caption text-today">
            Applied — {formatMoney(giftCardBalance)} available on this card
          </p>
        ) : null}
      </div>

      <div className="mt-3 rounded-card bg-surface p-4 shadow-rest">
        <div className="flex justify-between text-body text-muted">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        <div className="mt-1 flex justify-between text-body text-muted">
          <span>Delivery</span>
          <span>{formatMoney(DELIVERY_FEE)}</span>
        </div>
        {discount > 0 ? (
          <div className="mt-1 flex justify-between text-body text-today">
            <span>Gift card</span>
            <span>−{formatMoney(discount)}</span>
          </div>
        ) : null}
        <div className="mt-2 flex justify-between border-t border-line pt-2 text-price">
          <span>Total</span>
          <span>{formatMoney(total)}</span>
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
            className="inline-flex h-[52px] w-full items-center justify-center rounded-pill bg-primary text-body font-medium text-inverse transition-all duration-fast active:scale-[0.98] disabled:opacity-40"
          >
            {placeOrder.isPending ? "Placing order…" : `Place order — ${formatMoney(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
