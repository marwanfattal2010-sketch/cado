import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { usePurchaseGiftCard, type DeliveryMethod } from "../hooks/useGiftCards";
import { formatMoney } from "../lib/money";
import { QrCode } from "../components/QrCode";
import { Button, ButtonLink, Chip } from "../components/ui";
import { DigitalCardMock, EnvelopeCardArt } from "../components/giftcard/GiftCardArt";
import { GiftNoteBlock, OCCASIONS, suggestionFor, type NoteValue, type Occasion } from "../components/giftcard/GiftNote";

const AMOUNTS = [25, 50, 100, 150];
const WHISH_NUMBER = "81 900 002";

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
  const purchase = usePurchaseGiftCard();

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
  const [card, setCard] = useState<{ code: string; original_amount: number } | null>(null);
  const [copied, setCopied] = useState(false);

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

  if (card) {
    const shareUrl = `${window.location.origin}/gift-cards/redeem?code=${encodeURIComponent(card.code)}`;
    const shareText = `You've got a CADO gift card${note.from ? ` from ${note.from}` : ""}! Open this to redeem it: ${shareUrl}`;

    const onShare = async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: "CADO gift card", text: shareText, url: shareUrl });
          return;
        } catch {
          // user cancelled the share sheet — fall through to copy
        }
      }
      await navigator.clipboard?.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="mx-auto max-w-md px-5 py-6 text-center">
        <div className="rounded-sheet bg-ink p-6 text-inverse">
          <p className="text-eyebrow uppercase text-gold">Cado gift card</p>
          <p className="mt-4 font-display text-display">{formatMoney(card.original_amount)}</p>
          <p className="mt-4 break-all font-display text-h1 tracking-[0.15em]">{card.code}</p>
        </div>

        <p className="mt-5 text-body text-muted">Gift card reserved</p>

        {/* The card genuinely cannot be spent yet. Saying so here is the whole
            point — the screen must not imply money has moved. */}
        <div className="mt-3 rounded-card bg-surface-sunk p-4 text-left text-body">
          <span className="font-medium">Not active yet.</span> It becomes spendable once we confirm your Whish
          transfer to <span className="font-medium">{WHISH_NUMBER}</span>.
        </div>

        {delivery === "digital" ? (
          <div className="mt-6 rounded-sheet bg-surface p-6 shadow-rest">
            <p className="text-body font-medium">Share it{note.to ? ` with ${note.to}` : ""}</p>
            <QrCode value={shareUrl} alt="Gift card QR code" className="mx-auto mt-4 h-[220px] w-[220px]" />
            <p className="mt-3 text-caption text-muted">
              Whoever opens the link goes straight to CADO and sees they've received this card.
            </p>
            <Button onClick={onShare} variant="dark" fullWidth className="mt-4">
              {copied ? "Copied" : "Share"}
            </Button>
          </div>
        ) : (
          <div className="mt-6 rounded-sheet bg-surface p-6 text-body text-muted shadow-rest">
            We'll deliver the printed card to your address, with your note inside the envelope.
          </div>
        )}

        <Link to="/" className="mt-8 inline-block min-h-[44px] px-4 py-3 text-body text-muted underline">
          Back to home
        </Link>
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    if (!finalAmount || finalAmount <= 0) return setError("Choose an amount.");
    // Match the server's limits (purchase_gift_card, migration 0021) so a
    // custom amount fails here with a friendly line instead of a raw error.
    if (finalAmount < 10 || finalAmount > 500) {
      return setError("Gift cards can be $10 to $500.");
    }
    try {
      const result = await purchase.mutateAsync({
        amount: finalAmount,
        recipientName: note.to.trim() || undefined,
        message: note.message.trim() || undefined,
        deliveryMethod: delivery,
        buyerName: note.from.trim() || undefined,
      });
      setCard(result);
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

      <Button onClick={submit} disabled={purchase.isPending} fullWidth className="mt-8">
        {purchase.isPending ? "Creating your card…" : `Pay ${formatMoney(finalAmount || 0)}`}
      </Button>
      <p className="mt-3 text-center text-caption text-muted">
        Pay by Whish transfer to {WHISH_NUMBER}. Gift cards are valid for 2 years from purchase.
      </p>
      <div className="h-40" />
    </div>
  );
}
