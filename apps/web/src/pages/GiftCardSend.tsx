import { useState } from "react";

import { useAuth } from "../lib/auth";
import { type DeliveryMethod } from "../hooks/useGiftCards";
import { useAddGiftCardToCart } from "../hooks/useCart";
import { formatMoney } from "../lib/money";

import { Button, ButtonLink, Chip, useToast } from "../components/ui";
import { DigitalCardMock, EnvelopeCardArt } from "../components/giftcard/GiftCardArt";
import { GiftNoteBlock, OCCASIONS, suggestionFor, type NoteValue, type Occasion } from "../components/giftcard/GiftNote";

const AMOUNTS = [25, 50, 100, 150];

/** One input style, so a field never looks slightly different page to page. */
const FIELD =
  "w-full rounded-card border border-line bg-surface px-4 py-3.5 text-body outline-none transition focus:border-ink/35";

/**
 * One delivery option. Selected is a 2px Persimmon edge and a filled tick,
 * not a solid fill — filling it would drown the drawing that is the whole
 * reason the tile is this size.
 */
function DeliveryOption({
  selected,
  onSelect,
  title,
  desc,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative w-full rounded-[12px] bg-surface p-4 text-left transition-transform duration-press ease-out active:scale-[0.98] ${
        selected ? "border-2 border-persimmon" : "border border-line"
      }`}
    >
      <span
        aria-hidden
        className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-pill text-[13px] font-bold text-white ${
          selected ? "bg-persimmon" : "hidden"
        }`}
      >
        ✓
      </span>
      <span className="block">{children}</span>
      <span className="mt-3 block font-display text-h2">{title}</span>
      <span className="mt-1 block text-caption leading-snug text-muted">{desc}</span>
    </button>
  );
}

export function GiftCardSend() {
  const { session, profile } = useAuth();
  const addToCart = useAddGiftCardToCart();
  const toast = useToast();

  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [occasion, setOccasion] = useState<Occasion>("birthday");
  const [note, setNote] = useState<NoteValue>({
    to: "",
    from: profile?.full_name ?? "",
    message: suggestionFor("birthday", ""),
  });
  const [delivery, setDelivery] = useState<DeliveryMethod>("digital");
  const [error, setError] = useState<string | null>(null);

  const finalAmount = customAmount ? Number(customAmount) : amount;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Send a gift card</h1>
        <p className="mt-2 text-body text-muted">Log in to buy a gift card.</p>
        <ButtonLink to="/login" className="mt-6">
          Log in
        </ButtonLink>
      </div>
    );
  }

  /**
   * A gift card is bought like anything else now: it goes in the bag, and
   * the card itself is only created when the order is placed. Nothing here
   * mints a card or moves any money.
   */
  const submit = async () => {
    setError(null);
    if (!finalAmount || finalAmount <= 0) return setError("Choose an amount.");
    // Match the database's own bound so a custom amount fails here with a
    // friendly line instead of a raw constraint name.
    if (finalAmount < 10 || finalAmount > 500) {
      return setError("Gift cards can be $10 to $500.");
    }
    try {
      await addToCart.mutateAsync({
        amount: finalAmount,
        deliveryMethod: delivery,
        noteTo: note.to,
        noteFrom: note.from,
        noteMessage: note.message,
      });
      toast("Gift card added", { label: "View cart", to: "/cart" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <h1 className="font-display text-h1">Send a gift card</h1>

      <section className="mt-7">
        <p className="text-body font-medium">Amount</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => {
                setAmount(a);
                setCustomAmount("");
              }}
              className={`min-h-[52px] rounded-card text-body font-semibold transition-all duration-fast active:scale-[0.97] ${
                !customAmount && amount === a ? "bg-persimmon text-white" : "border border-line bg-surface"
              }`}
            >
              {formatMoney(a)}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={10}
          max={500}
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          placeholder="Or another amount ($10–$500)"
          aria-label="Custom gift card amount in dollars"
          className={`mt-3 ${FIELD}`}
        />
      </section>

      <section className="mt-7">
        <p className="text-body font-medium">What's the occasion?</p>
        <div className="scroll-row mt-3" style={{ ["--row-gap" as string]: "8px" }}>
          {OCCASIONS.map((o) => (
            <Chip key={o.value} active={occasion === o.value} onClick={() => setOccasion(o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <p className="text-body font-medium">How should it arrive?</p>
        <div className="mt-3 flex flex-col gap-3">
          <DeliveryOption
            selected={delivery === "digital"}
            onSelect={() => setDelivery("digital")}
            title="Digital card"
            desc="They get a link and a QR code. Arrives instantly."
          >
            <DigitalCardMock amount={formatMoney(finalAmount || 0)} className="w-full max-w-[260px]" />
          </DeliveryOption>
          <DeliveryOption
            selected={delivery === "physical"}
            onSelect={() => setDelivery("physical")}
            title="Real card, delivered"
            desc="A real CADO card in an envelope, hand-delivered with a small note."
          >
            <EnvelopeCardArt className="w-full max-w-[260px]" />
          </DeliveryOption>
        </div>
      </section>

      <GiftNoteBlock occasion={occasion} value={note} onChange={setNote} />

      {error ? (
        <p role="alert" className="mt-6 text-body text-alert">
          {error}
        </p>
      ) : null}

      <Button onClick={submit} disabled={addToCart.isPending} variant="accent" fullWidth className="mt-8">
        {addToCart.isPending ? "Adding…" : "Add to cart"}
      </Button>
      <p className="mt-3 text-center text-caption text-muted">
        Paid for at checkout, like anything else. Gift cards are valid for 2 years.
      </p>
      <div className="h-40" />
    </div>
  );
}
