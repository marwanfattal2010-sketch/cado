import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { usePurchaseGiftCard, type DeliveryMethod } from "../hooks/useGiftCards";
import { QrCode } from "../components/QrCode";

const AMOUNTS = [25, 50, 100, 150];
const SUGGESTED = ["Happy birthday!", "Congratulations!", "Best wishes", "Thinking of you"];
const WHISH_NUMBER = "81 900 002";

export function GiftCardSend() {
  const { session, profile } = useAuth();
  const purchase = usePurchaseGiftCard();

  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMethod>("digital");
  const [fromName, setFromName] = useState(profile?.full_name ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<{ code: string; original_amount: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const finalAmount = customAmount ? Number(customAmount) : amount;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Send a gift card</h1>
        <p className="mt-2 text-sm text-ink/50">Log in to buy a gift card.</p>
        <Link to="/login" className="mt-6 inline-block rounded-pill bg-ink px-8 py-3 text-sm text-cream">
          Log in
        </Link>
      </div>
    );
  }

  if (card) {
    const shareUrl = `${window.location.origin}/gift-cards/redeem?code=${encodeURIComponent(card.code)}`;
    const shareText = `You've got a CADO gift card${fromName ? ` from ${fromName}` : ""}! Open this to redeem it: ${shareUrl}`;

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
        <div className="rounded-sheet bg-ink p-6 text-cream">
          <p className="text-[11px] tracking-[0.3em] text-gold">CADO GIFT CARD</p>
          <p className="mt-4 font-display text-3xl font-semibold">USD {Number(card.original_amount).toFixed(2)}</p>
          <p className="mt-4 font-display text-xl font-semibold tracking-[0.15em] break-all">{card.code}</p>
        </div>

        <p className="mt-5 text-sm text-ink/50">Gift card reserved</p>

        <div className="mt-3 rounded-card bg-ink/5 p-4 text-left text-sm text-ink/70">
          <span className="font-medium">Not active yet.</span> It becomes spendable once we confirm your
          Whish transfer to <span className="font-medium">{WHISH_NUMBER}</span>.
        </div>

        {delivery === "digital" ? (
          <div className="mt-6 rounded-sheet bg-white p-6 ring-1 ring-ink/8">
            <p className="text-sm font-medium">Share it{recipientName ? ` with ${recipientName}` : ""}</p>
            <QrCode value={shareUrl} alt="Gift card QR code" className="mx-auto mt-4 h-[220px] w-[220px]" />
            <p className="mt-3 text-xs text-ink/50">
              Whoever opens the link goes straight to CADO and sees they've received this card.
            </p>
            <button
              onClick={onShare}
              className="mt-4 w-full rounded-pill bg-ink py-3 text-sm font-medium text-cream"
            >
              {copied ? "Copied!" : "Share"}
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-sheet bg-white p-6 text-sm text-ink/60 ring-1 ring-ink/8">
            We'll deliver the physical card to your address, with the code printed on it.
          </div>
        )}

        <Link to="/" className="mt-8 inline-block text-sm text-ink/50 underline">
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
        recipientName: recipientName.trim() || undefined,
        message: message.trim() || undefined,
        deliveryMethod: delivery,
        buyerName: fromName.trim() || undefined,
      });
      setCard(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <h1 className="font-display text-2xl font-semibold">Send a gift card</h1>

      <section className="mt-7">
        <p className="text-sm font-medium">Amount</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => {
                setAmount(a);
                setCustomAmount("");
              }}
              className={`rounded-card py-3.5 text-sm font-semibold transition ${
                !customAmount && amount === a ? "bg-ink text-cream" : "bg-white ring-1 ring-ink/8"
              }`}
            >
              ${a}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={10}
          max={500}
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          placeholder="Or enter another amount ($10–$500)"
          className="mt-3 w-full rounded-card border border-ink/12 bg-white px-4 py-3 text-sm outline-none focus:border-ink/35"
        />
      </section>

      <section className="mt-7">
        <p className="text-sm font-medium">Message</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => setMessage(s)}
              className={`rounded-pill px-3.5 py-1.5 text-xs transition ${
                message === s ? "bg-ink text-cream" : "bg-ink/5 text-ink/60"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Write your own message..."
          className="mt-3 w-full resize-none rounded-card border border-ink/12 bg-white px-4 py-3 text-sm outline-none focus:border-ink/35"
        />
      </section>

      <section className="mt-7">
        <p className="text-sm font-medium">How should it arrive?</p>
        <div className="mt-3 flex flex-col gap-3">
          <button
            onClick={() => setDelivery("digital")}
            className={`rounded-card p-4 text-left transition ${
              delivery === "digital" ? "bg-ink text-cream" : "bg-white ring-1 ring-ink/8"
            }`}
          >
            <p className="text-sm font-semibold">Send a QR code</p>
            <p className={`mt-0.5 text-xs ${delivery === "digital" ? "text-cream/60" : "text-ink/50"}`}>
              Share it any way you like — the balance is added the moment it's redeemed.
            </p>
          </button>
          <button
            onClick={() => setDelivery("physical")}
            className={`rounded-card p-4 text-left transition ${
              delivery === "physical" ? "bg-ink text-cream" : "bg-white ring-1 ring-ink/8"
            }`}
          >
            <p className="text-sm font-semibold">Deliver a real card</p>
            <p className={`mt-0.5 text-xs ${delivery === "physical" ? "text-cream/60" : "text-ink/50"}`}>
              We bring a printed gift card to your address.
            </p>
          </button>
        </div>
      </section>

      <section className="mt-7">
        <p className="text-sm font-medium">From</p>
        <input
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="Your name"
          className="mt-3 w-full rounded-card border border-ink/12 bg-white px-4 py-3 text-sm outline-none focus:border-ink/35"
        />
        <p className="mt-1.5 text-xs text-ink/40">Shown to whoever opens the card: "You've received a gift from ___".</p>
      </section>

      <section className="mt-7">
        <p className="text-sm font-medium">Who is it for? <span className="font-normal text-ink/40">(optional)</span></p>
        <input
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Their name"
          className="mt-3 w-full rounded-card border border-ink/12 bg-white px-4 py-3 text-sm outline-none focus:border-ink/35"
        />
      </section>

      {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

      <button
        onClick={submit}
        disabled={purchase.isPending}
        className="mt-8 w-full rounded-pill bg-ink py-4 text-sm font-medium text-cream disabled:opacity-50"
      >
        {purchase.isPending ? "Creating..." : `Pay USD ${finalAmount || 0}`}
      </button>
      <p className="mt-3 text-center text-xs text-ink/40">
        Pay by Whish transfer to {WHISH_NUMBER}. Gift cards are valid for 2 years from purchase.
      </p>
      <div className="h-40" />
    </div>
  );
}
