import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { usePurchaseGiftCard } from "../hooks/useGiftCards";

const AMOUNTS = [25, 50, 100, 150];

export function GiftCards() {
  const { session } = useAuth();
  const purchase = usePurchaseGiftCard();
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [purchasedCode, setPurchasedCode] = useState<string | null>(null);

  const finalAmount = customAmount ? Number(customAmount) : amount;

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Gift Cards</h1>
        <p className="mt-4 text-ink/60">Log in to buy a CADO gift card.</p>
        <Link to="/login" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm text-cream">
          Log in
        </Link>
      </div>
    );
  }

  if (purchasedCode) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Gift card ready</h1>
        <p className="mt-4 text-ink/60">Share this code with {recipientName} — they can use it at checkout.</p>
        <div className="mt-8 rounded-2xl border border-gold/40 bg-ink px-8 py-6 font-display text-3xl tracking-widest text-gold">
          {purchasedCode}
        </div>
        <p className="mt-4 text-sm text-ink/50">
          Value: USD {finalAmount.toFixed(2)}
          {message ? <> — "{message}"</> : null}
        </p>
        <Link to="/" className="mt-8 inline-block rounded-full bg-ink px-6 py-3 text-sm text-cream">
          Back home
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!recipientName.trim()) {
      setError("Add a recipient name");
      return;
    }
    if (!finalAmount || finalAmount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    try {
      const card = await purchase.mutateAsync({
        amount: finalAmount,
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim() || undefined,
        message: message.trim() || undefined,
      });
      setPurchasedCode(card.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create gift card");
    }
  };

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="font-display text-4xl">Gift Cards</h1>
      <p className="mt-3 text-ink/60">
        For a birthday, or whenever you're not sure what to pick — send a CADO gift card and let them choose.
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-6">
        <div>
          <p className="mb-3 text-sm font-semibold tracking-wide text-ink/50">AMOUNT</p>
          <div className="grid grid-cols-4 gap-3">
            {AMOUNTS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => {
                  setAmount(a);
                  setCustomAmount("");
                }}
                className={`rounded-xl border py-3 text-sm font-medium ${
                  !customAmount && amount === a ? "border-ink bg-ink text-cream" : "border-ink/15"
                }`}
              >
                ${a}
              </button>
            ))}
          </div>
          <input
            className="mt-3 w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            type="number"
            min={1}
            placeholder="Custom amount (USD)"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <input
            className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            placeholder="Recipient name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            type="email"
            placeholder="Recipient email (optional)"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />
          <textarea
            className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm"
            placeholder="Personal message (optional)"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={purchase.isPending}
          className="w-full rounded-full bg-ink py-3 text-sm tracking-wide text-cream disabled:opacity-50"
        >
          {purchase.isPending ? "Creating..." : `Get gift card — USD ${finalAmount || 0}`}
        </button>
        <p className="text-center text-xs text-ink/40">
          Payment on delivery, same as any CADO order — we'll arrange collection after purchase.
        </p>
      </form>
    </div>
  );
}
