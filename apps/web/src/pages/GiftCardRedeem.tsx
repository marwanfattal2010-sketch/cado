import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { checkGiftCardBalance } from "../hooks/useGiftCards";

const STORAGE_KEY = "cado-gift-card";

export function GiftCardRedeem() {
  const [params] = useSearchParams();
  const { session } = useAuth();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [pin, setPin] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  const verify = async (codeValue: string, pinValue: string) => {
    setError(null);
    setBalance(null);
    if (!codeValue.trim() || pinValue.trim().length !== 6) {
      return setError("Enter the code and the 6-digit PIN from your card.");
    }

    setChecking(true);
    try {
      const result = await checkGiftCardBalance(codeValue, pinValue);
      if (!result) {
        setError("That code or PIN isn't valid.");
      } else {
        setBalance(Number(result.remaining_balance));
        // Applied automatically at checkout, for this browser tab only.
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ code: codeValue.trim(), pin: pinValue.trim() }));
      }
    } catch (e) {
      // The server returns one generic message for every rejection reason.
      setError(e instanceof Error ? e.message : "That code or PIN isn't valid.");
    } finally {
      setChecking(false);
    }
  };

  // A code arriving via QR/link still needs the PIN typed in — it never travels in the URL.
  useEffect(() => {
    const fromLink = params.get("code");
    if (fromLink) setCode(fromLink);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        Enter the code and PIN printed on your card or link.
      </p>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.trim().toUpperCase())}
        placeholder="Gift card code"
        className="mt-8 w-full rounded-2xl border border-ink/12 bg-white px-5 py-4 text-center font-display text-lg font-semibold tracking-wider outline-none focus:border-ink/35"
      />
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        placeholder="PIN"
        className="mt-3 w-full rounded-2xl border border-ink/12 bg-white py-5 text-center font-display text-3xl font-semibold tracking-[0.4em] outline-none focus:border-ink/35"
      />

      {error ? <p className="mt-4 text-center text-sm text-red-600">{error}</p> : null}

      <button
        onClick={() => verify(code, pin)}
        disabled={checking || !code.trim() || pin.length !== 6}
        className="mt-6 w-full rounded-full bg-ink py-4 text-sm font-medium text-cream disabled:opacity-40"
      >
        {checking ? "Checking..." : "Redeem"}
      </button>
    </div>
  );
}
