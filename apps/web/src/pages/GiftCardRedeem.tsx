import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { checkGiftCardBalance, normalizeGiftCardCode } from "../hooks/useGiftCards";

const STORAGE_KEY = "cado-gift-card";

export function GiftCardRedeem() {
  const [params] = useSearchParams();
  const { session } = useAuth();
  const [code, setCode] = useState(normalizeGiftCardCode(params.get("code") ?? ""));
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ balance: number; fromName: string | null; message: string | null } | null>(
    null
  );

  const verify = async (codeValue: string) => {
    setError(null);
    setResult(null);
    const clean = normalizeGiftCardCode(codeValue);
    if (!clean) {
      return setError("Enter the gift card code.");
    }

    setChecking(true);
    try {
      const found = await checkGiftCardBalance(clean);
      if (!found) {
        setError("That code isn't valid.");
      } else {
        setResult({ balance: Number(found.remaining_balance), fromName: found.from_name, message: found.card_message });
        // Hand the code to checkout, where it's applied automatically.
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code: clean }));
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
      setCode(normalizeGiftCardCode(fromLink));
      void verify(fromLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Redeem a gift card</h1>
        <p className="mx-auto mt-2 max-w-xs text-body text-muted">
          Log in first, then we'll apply the card at checkout.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex h-[52px] items-center rounded-pill bg-ribbon px-8 text-body font-medium text-inverse"
        >
          Log in
        </Link>
      </div>
    );
  }

  if (result !== null) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <div className="rounded-sheet bg-ink p-8 text-inverse">
          <p className="text-eyebrow uppercase text-gold">
            {result.fromName ? `A gift from ${result.fromName}` : "Gift card ready"}
          </p>
          <p className="mt-4 font-display text-display">USD {result.balance.toFixed(2)}</p>
          {result.message ? <p className="mt-3 text-body text-inverse/70">"{result.message}"</p> : null}
        </div>
        <p className="mx-auto mt-6 max-w-xs text-body text-muted">
          We'll apply it automatically at checkout. If your order costs more, you only pay the
          difference.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex h-[52px] items-center rounded-pill bg-ribbon px-8 text-body font-medium text-inverse"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-center font-display text-h1">Redeem a gift card</h1>
      <p className="mt-2 text-center text-body text-muted">Enter the code from your card or link.</p>

      <input
        value={code}
        onChange={(e) => setCode(normalizeGiftCardCode(e.target.value))}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        placeholder="XXXX-XXXX-XXXX"
        className="mt-8 w-full rounded-card border border-line bg-surface px-5 py-4 text-center font-display text-h2 tracking-wider outline-none focus:border-ink/35"
      />

      {checking ? <p className="mt-4 text-center text-body text-muted">Checking...</p> : null}
      {error ? <p className="mt-4 text-center text-body text-alert">{error}</p> : null}

      <button
        onClick={() => verify(code)}
        disabled={checking || !code.trim()}
        className="mt-6 h-[52px] w-full rounded-pill bg-ribbon text-body font-medium text-inverse disabled:opacity-40"
      >
        {checking ? "Checking..." : "Redeem"}
      </button>
    </div>
  );
}
