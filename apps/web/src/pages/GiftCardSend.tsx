import { useState } from "react";

import { useAuth } from "../lib/auth";
import { type DeliveryMethod } from "../hooks/useGiftCards";
import { useAddGiftCardToCart } from "../hooks/useCart";
import { formatMoney } from "../lib/money";

import { Button, ButtonLink, useToast } from "../components/ui";
import { PersimmonCard } from "../components/giftcard/PersimmonCard";

const AMOUNTS = [25, 50, 100, 150];
const MAX_MESSAGE = 120;

/** One field style, so nothing looks slightly different row to row. */
const FIELD =
  "w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-body outline-none transition focus:border-ink/35";

/** Small caps section label — a label, not a heading. */
function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</p>;
}

/**
 * Buy a gift card, on one screen.
 *
 * This was four tall sections and two card mockups deep — a scroll to do
 * something that is really four small decisions. Everything is here at once
 * now: the amount, what the card will say, how it travels, and who it is for.
 *
 * The live preview is the shared Persimmon card and shows only the amount.
 * The old "little note" preview box repeated the fields underneath it as a
 * picture, which is the same information twice and one more thing to scroll
 * past.
 */
export function GiftCardSend() {
  const { session, profile } = useAuth();
  const addToCart = useAddGiftCardToCart();
  const toast = useToast();

  const [amount, setAmount] = useState(50);
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [to, setTo] = useState("");
  const [from, setFrom] = useState(profile?.full_name ?? "");
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMethod>("digital");
  const [error, setError] = useState<string | null>(null);

  const finalAmount = customOpen && customAmount ? Number(customAmount) : amount;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h2">Send a gift card</h1>
        <p className="mt-2 text-body text-muted">Log in to buy a gift card.</p>
        <ButtonLink to="/login" className="mt-6">
          Log in
        </ButtonLink>
      </div>
    );
  }

  /**
   * A gift card is bought like anything else: it goes in the bag, and the
   * card itself is only created when the order is placed. Nothing here mints
   * a card or moves any money.
   */
  const submit = async () => {
    setError(null);
    if (!finalAmount || finalAmount <= 0) return setError("Choose an amount.");
    // The database's own bound, so a custom amount fails here with a friendly
    // line instead of a raw constraint name.
    if (finalAmount < 10 || finalAmount > 500) return setError("Gift cards can be $10 to $500.");
    try {
      await addToCart.mutateAsync({
        amount: finalAmount,
        deliveryMethod: delivery,
        noteTo: to,
        noteFrom: from,
        noteMessage: message,
      });
      toast("Gift card added", { label: "View cart", to: "/cart" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col px-5 pb-4 pt-4">
      <h1 className="font-display text-h2">Send a gift card</h1>

      {/* 1 — amount */}
      <div className="mt-3">
        <Label>Amount</Label>
        <div className="mt-1.5 flex gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAmount(a);
                setCustomOpen(false);
                setCustomAmount("");
              }}
              className={`h-10 flex-1 rounded-[8px] text-[14px] font-semibold transition-all duration-fast active:scale-[0.97] ${
                !customOpen && amount === a ? "bg-persimmon text-white" : "border border-line bg-surface"
              }`}
            >
              {formatMoney(a)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomOpen((v) => !v)}
            aria-pressed={customOpen}
            className={`h-10 shrink-0 rounded-[8px] px-3 text-[14px] font-semibold transition-all duration-fast active:scale-[0.97] ${
              customOpen ? "bg-persimmon text-white" : "border border-line bg-surface"
            }`}
          >
            Other
          </button>
        </div>
        {customOpen ? (
          <input
            type="number"
            min={10}
            max={500}
            autoFocus
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="$10 – $500"
            aria-label="Custom gift card amount in dollars"
            className={`mt-2 ${FIELD}`}
          />
        ) : null}
      </div>

      {/* 2 — the card, with the chosen amount on it */}
      <div className="mt-3">
        <PersimmonCard amount={formatMoney(finalAmount || 0)} />
      </div>

      {/* 3 — how it arrives */}
      <div className="mt-3">
        <Label>How it arrives</Label>
        <div className="mt-1.5 flex rounded-[10px] border border-line bg-surface p-1">
          {(
            [
              { key: "digital", label: "Link or QR" },
              { key: "physical", label: "Real card" },
            ] as { key: DeliveryMethod; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setDelivery(opt.key)}
              aria-pressed={delivery === opt.key}
              className={`h-9 flex-1 rounded-[7px] text-[13px] font-medium transition ${
                delivery === opt.key ? "bg-persimmon text-white" : "text-ink"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-caption leading-snug text-muted">
          {delivery === "digital"
            ? "Sent instantly — they tap the link and the balance is theirs."
            : "A real card in a sealed envelope with your note. Delivery fee at checkout."}
        </p>
      </div>

      {/* 4 — who it is for */}
      <div className="mt-3">
        <Label>The note</Label>
        <div className="mt-1.5 flex gap-2">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
            aria-label="Recipient's name"
            className={FIELD}
          />
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From"
            aria-label="Your name"
            className={FIELD}
          />
        </div>
        <input
          value={message}
          maxLength={MAX_MESSAGE}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message (optional)"
          aria-label="Message"
          className={`mt-2 ${FIELD}`}
        />
        <p className="mt-1 text-right text-[11px] text-muted">
          {message.length}/{MAX_MESSAGE}
        </p>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-caption text-alert">
          {error}
        </p>
      ) : null}

      <Button onClick={submit} disabled={addToCart.isPending} variant="accent" fullWidth className="mt-3">
        {addToCart.isPending ? "Adding…" : "Add to gift"}
      </Button>
      <p className="mt-2 text-center text-[11px] text-muted">Paid at checkout. Valid for 2 years.</p>
      {/* Clear of the pinned bottom nav. */}
      <div className="h-20" />
    </div>
  );
}
