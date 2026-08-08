import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { checkGiftCardBalance } from "../hooks/useGiftCards";

const STORAGE_KEY = "cado-gift-card";

export function GiftCardRedeem() {
  const [params] = useSearchParams();
  const { session } = useAuth();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ balance: number; fromName: string | null; message: string | null } | null>(
    null
  );

  const verify = async (codeValue: string) => {
    setError(null);
    setResult(null);
    if (!codeValue.trim()) {
      return setError("Enter the gift card code.");
    }

    setChecking(true);
    try {
      const found = await checkGiftCardBalance(codeValue);
      if (!found) {
        setError("That code isn't valid.");
      } else {
        setResult({ balance: Number(found.remaining_balance), fromName: found.from_name, message: found.card_message });
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code: codeValue.trim() }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code isn't valid.");
    } finally {
      setChecking(false);
    }
  };

  // Arriving via a shared link checks the code automatically — no typing needed.
  useEffect(() => {
    const fromLink = params.get("code");
    if (fromLink && session) {
      setCode(fromLink);
      void verify(fromLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Redeem a gift card</h1>
        <p className="mt-2 text-sm text-ink/50">
          Log in first so the balance is saved to your account.
        </p>
        <Link to="/login" className="mt-6 inline-block rounded-pill bg-ink px-8 py-3 text-sm text-cream">
          Log in
        </Link>
      </div>
    );
  }

  if (result !== null) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <div className="rounded-sheet bg-ink p-8 text-cream">
          <p className="text-[11px] tracking-[0.3em] text-gold">
            {result.fromName ? `YOU'VE RECEIVED A GIFT FROM ${result.fromName.toUpperCase()}` : "GIFT CARD ADDED"}
          </p>
          <p className="mt-4 font-display text-4xl font-semibold">USD {result.balance.toFixed(2)}</p>
          {result.message ? <p className="mt-3 text-sm text-cream/70">"{result.message}"</p> : null}
        </div>
        <p className="mt-6 text-sm text-ink/60">
          This will be applied automatically at checkout. If your order costs more, you only pay the
          difference.
        </p>
        <Link to="/" className="mt-8 inline-block rounded-pill bg-ink px-8 py-3.5 text-sm text-cream">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-center font-display text-2xl font-semibold">Redeem a gift card</h1>
      <p className="mt-2 text-center text-sm text-ink/50">Enter the code from your card or link.</p>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.trim().toUpperCase())}
        placeholder="Gift card code"
        className="mt-8 w-full rounded-card border border-ink/12 bg-white px-5 py-4 text-center font-display text-lg font-semibold tracking-wider outline-none focus:border-ink/35"
      />

      {checking ? <p className="mt-4 text-center text-sm text-ink/40">Checking...</p> : null}
      {error ? <p className="mt-4 text-center text-sm text-red-600">{error}</p> : null}

      <button
        onClick={() => verify(code)}
        disabled={checking || !code.trim()}
        className="mt-6 w-full rounded-pill bg-ink py-4 text-sm font-medium text-cream disabled:opacity-40"
      >
        {checking ? "Checking..." : "Redeem"}
      </button>
    </div>
  );
}
