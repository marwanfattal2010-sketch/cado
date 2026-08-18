import { useState } from "react";

import { useAuth } from "../lib/auth";
import { type DeliveryMethod } from "../hooks/useGiftCards";
import { useAddGiftCardToCart } from "../hooks/useCart";
import { formatMoney } from "../lib/money";

import { Button, ButtonLink, useToast } from "../components/ui";
import { LiveCardPreview, PhysicalCardPhotoSlot } from "../components/giftcard/GiftCardArt";
import { GiftNoteBlock, type NoteValue } from "../components/giftcard/GiftNote";

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
  const [note, setNote] = useState<NoteValue>({
    to: "",
    from: profile?.full_name ?? "",
    // Empty on purpose: with the occasion question gone there is no honest
    // greeting to pre-write. What they type is what prints.
    message: "",
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

      {/* The occasion question is gone on purpose: it added a decision
          without changing anything about the card. */}

      {/* THE signature moment: the card itself, updating as they choose.
          Amount changes with the chips above; the note appears under it as
          they type below. Empty fields show nothing — the preview only ever
          contains what the buyer wrote. */}
      <section className="mt-7">
        <LiveCardPreview
          amount={formatMoney(finalAmount || 0)}
          to={note.to}
          from={note.from}
          message={note.message}
          className="mx-auto max-w-[340px]"
        />
      </section>

      <section className="mt-7">
        <p className="text-body font-medium">How should it arrive?</p>
        <div className="mt-3 flex flex-col gap-3">
          <DeliveryOption
            selected={delivery === "digital"}
            onSelect={() => setDelivery("digital")}
            title="Link or QR"
            desc="Sent instantly. They tap it and the balance is theirs."
          >
            {/* The live preview above is the card; repeating it inside the
                tile would be the same picture twice on one screen. */}
            <span className="block h-1" aria-hidden />
          </DeliveryOption>
          <DeliveryOption
            selected={delivery === "physical"}
            onSelect={() => setDelivery("physical")}
            title="Real card, delivered"
            desc="A CADO card in a sealed envelope with your note, hand-delivered today. Normal delivery fee applies at checkout."
          >
            <PhysicalCardPhotoSlot className="w-full max-w-[260px]" />
            <span className="mt-2 block text-caption leading-snug text-muted">
              Inside the envelope: a CADO card with its code, and your printed note. They redeem the
              code in the app and the balance is theirs.
            </span>
          </DeliveryOption>
        </div>
      </section>

      {/* "just-because" suggests nothing — the honest default now that nobody is asked the occasion. */}
      <GiftNoteBlock occasion="just-because" value={note} onChange={setNote} />

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
