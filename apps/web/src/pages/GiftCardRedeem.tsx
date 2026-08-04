import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { redeemGiftCard } from "../hooks/useGiftCards";

const STORAGE_KEY = "cado-gift-card";

export function GiftCardRedeem() {
  const [params] = useSearchParams();
  const { session } = useAuth();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const verify = async (value: string) => {
    setError(null);
    setBalance(null);
    const clean = value.trim();
    if (clean.length !== 6) return setError("Gift card codes are 6 digits.");

    setChecking(true);
    try {
      const result = await redeemGiftCard(clean);
      if (!result) {
        setError("That code isn't valid, or the balance is used up.");
      } else {
        setBalance(Number(result.remaining_balance));
        // Applied automatically at checkout.
        localStorage.setItem(STORAGE_KEY, clean);
      }
    } catch (e) {
      // The server rate-limits guesses; show its reason verbatim.
      setError(e instanceof Error ? e.message : "Couldn't check that code. Try again.");
    } finally {
      setChecking(false);
    }
  };

  // Auto-verify when arriving from a QR code / shared link, once signed in.
  useEffect(() => {
    const fromLink = params.get("code");
    if (fromLink && session) void verify(fromLink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Redeem a gift card</h1>
        <p className="mt-2 text-sm text-ink/50">
          Log in first so the balance is saved to your account.
        </p>
        <Link to="/login" className="mt-6 inline-block rounded-full bg-ink px-8 py-3 text-sm text-cream">
          Log in
        </Link>
      </div>
    );
  }

  if (balance !== null) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <div className="rounded-3xl bg-ink p-8 text-cream">
          <p className="text-[11px] tracking-[0.3em] text-gold">BALANCE ADDED</p>
          <p className="mt-4 font-display text-4xl font-semibold">USD {balance.toFixed(2)}</p>
        </div>
        <p className="mt-6 text-sm text-ink/60">
          This will be applied automatically at checkout. If your order costs more, you only pay the
          difference.
        </p>
        <Link to="/" className="mt-8 inline-block rounded-full bg-ink px-8 py-3.5 text-sm text-cream">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-center font-display text-2xl font-semibold">Redeem a gift card</h1>
      <p className="mt-2 text-center text-sm text-ink/50">
        Enter the 6-digit code from your card or link.
      </p>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        placeholder="000000"
        className="mt-8 w-full rounded-2xl border border-ink/12 bg-white py-5 text-center font-display text-3xl font-semibold tracking-[0.4em] outline-none focus:border-ink/35"
      />

      {error ? <p className="mt-4 text-center text-sm text-red-600">{error}</p> : null}

      <button
        onClick={() => verify(code)}
        disabled={checking || code.length !== 6}
        className="mt-6 w-full rounded-full bg-ink py-4 text-sm font-medium text-cream disabled:opacity-40"
      >
        {checking ? "Checking..." : "Redeem"}
      </button>
    </div>
  );
}
