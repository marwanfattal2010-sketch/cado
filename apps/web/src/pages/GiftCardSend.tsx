import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { usePurchaseGiftCard, type DeliveryMethod } from "../hooks/useGiftCards";

const AMOUNTS = [25, 50, 100, 150];
const SUGGESTED = ["Happy birthday!", "Congratulations!", "Best wishes", "Thinking of you"];

export function GiftCardSend() {
  const { session } = useAuth();
  const purchase = usePurchaseGiftCard();

  const [amount, setAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState<DeliveryMethod>("digital");
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<{ code: string; initial_amount: number } | null>(null);

  const finalAmount = customAmount ? Number(customAmount) : amount;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Send a gift card</h1>
        <p className="mt-2 text-sm text-ink/50">Log in to buy a gift card.</p>
        <Link to="/login" className="mt-6 inline-block rounded-full bg-ink px-8 py-3 text-sm text-cream">
          Log in
        </Link>
      </div>
    );
  }

  if (card) {
    const shareUrl = `${window.location.origin}/gift-cards/redeem?code=${card.code}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;

    return (
      <div className="mx-auto max-w-md px-5 py-10 text-center">
        <p className="text-sm text-ink/50">Gift card created</p>
        <p className="mt-1 font-display text-3xl font-semibold">
          USD {Number(card.initial_amount).toFixed(2)}
        </p>

        <div className="mt-6 rounded-3xl bg-ink p-6 text-cream">
          <p className="text-[11px] tracking-[0.3em] text-gold">CADO GIFT CARD</p>
          <p className="mt-4 font-display text-4xl font-semibold tracking-[0.25em]">{card.code}</p>
          <p className="mt-3 text-xs text-cream/50">6-digit code</p>
        </div>

        {delivery === "digital" ? (
          <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-ink/8">
            <p className="text-sm font-medium">Send this to {recipientName || "them"}</p>
            <img src={qrSrc} alt="Gift card QR code" className="mx-auto mt-4 h-[220px] w-[220px]" />
            <p className="mt-3 break-all text-xs text-ink/40">{shareUrl}</p>
            <button
              onClick={() => navigator.clipboard?.writeText(shareUrl)}
              className="mt-4 w-full rounded-full bg-ink/5 py-3 text-sm font-medium"
            >
              Copy link
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl bg-white p-6 text-sm text-ink/60 ring-1 ring-ink/8">
            We'll deliver the physical card to your address. Keep this code safe — it's printed on
            the card too.
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
    if (!recipientName.trim()) return setError("Who is this gift for?");
    if (delivery === "digital" && !recipientEmail.trim()) {
      return setError("Add the recipient's email so we can send the card.");
    }
    try {
      const result = await purchase.mutateAsync({
        amount: finalAmount,
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim() || undefined,
        message: message.trim() || undefined,
        deliveryMethod: delivery,
      });
      setCard(result as { code: string; initial_amount: number });
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
              className={`rounded-2xl py-3.5 text-sm font-semibold transition ${
                !customAmount && amount === a ? "bg-ink text-cream" : "bg-white ring-1 ring-ink/8"
              }`}
            >
              ${a}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          placeholder="Or enter another amount"
          className="mt-3 w-full rounded-2xl border border-ink/12 bg-white px-4 py-3 text-sm outline-none focus:border-ink/35"
        />
      </section>

      <section className="mt-7">
        <p className="text-sm font-medium">Who is it for?</p>
        <input
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Their name"
          className="mt-3 w-full rounded-2xl border border-ink/12 bg-white px-4 py-3 text-sm outline-none focus:border-ink/35"
        />
      </section>

      <section className="mt-7">
        <p className="text-sm font-medium">Message</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => setMessage(s)}
              className={`rounded-full px-3.5 py-1.5 text-xs transition ${
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
          className="mt-3 w-full resize-none rounded-2xl border border-ink/12 bg-white px-4 py-3 text-sm outline-none focus:border-ink/35"
        />
      </section>

      <section className="mt-7">
        <p className="text-sm font-medium">How should it arrive?</p>
        <div className="mt-3 flex flex-col gap-3">
          <button
            onClick={() => setDelivery("digital")}
            className={`rounded-2xl p-4 text-left transition ${
              delivery === "digital" ? "bg-ink text-cream" : "bg-white ring-1 ring-ink/8"
            }`}
          >
            <p className="text-sm font-semibold">Send a QR code</p>
            <p className={`mt-0.5 text-xs ${delivery === "digital" ? "text-cream/60" : "text-ink/50"}`}>
              They scan it and the balance is added instantly.
            </p>
          </button>
          <button
            onClick={() => setDelivery("physical")}
            className={`rounded-2xl p-4 text-left transition ${
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

      {delivery === "digital" ? (
        <section className="mt-7">
          <p className="text-sm font-medium">Their email</p>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="name@email.com"
            className="mt-3 w-full rounded-2xl border border-ink/12 bg-white px-4 py-3 text-sm outline-none focus:border-ink/35"
          />
        </section>
      ) : null}

      {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

      <button
        onClick={submit}
        disabled={purchase.isPending}
        className="mt-8 w-full rounded-full bg-ink py-4 text-sm font-medium text-cream disabled:opacity-50"
      >
        {purchase.isPending ? "Creating..." : `Pay USD ${finalAmount || 0}`}
      </button>
      <p className="mt-3 text-center text-xs text-ink/40">
        Pay cash on delivery or by Whish transfer.
      </p>
    </div>
  );
}
