import { useState } from "react";
import { formatMoney } from "../../lib/money";
import { useAuth } from "../../lib/auth";
import { formatCodeInput, normaliseCode, useRedeemToWallet } from "../../hooks/useWallet";

/**
 * "Redeem a code" — moves a gift card's remaining value into the wallet.
 *
 * TWO FORMATS, ON PURPOSE. New cards carry a nine-digit code and this input
 * groups it 333-333-333 as you type. Cards already sold carry a twenty
 * character code, and those are left alone by the formatter — regrouping
 * them into threes would make people think they had typed it wrong.
 *
 * THE PIN FIELD IS NOT OPTIONAL DECORATION. Cards issued before the wallet
 * were sold with a PIN, and the server still demands it for them: a code
 * alone must not be enough to move money that someone paid for. New numeric
 * codes have no PIN, so the field only appears once what has been typed
 * stops looking like one.
 *
 * Nothing here decides whether a code is valid. It normalises, sends, and
 * reports what the database said — which returns one identical message for
 * every kind of failure, so this screen cannot leak which part was wrong.
 */
export function RedeemToWallet() {
  const { session } = useAuth();
  const redeem = useRedeemToWallet();
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [done, setDone] = useState<{ redeemed: number; newBalance: number } | null>(null);

  const raw = normaliseCode(code);
  /** A nine-digit code needs no PIN; anything else is an older card. */
  const looksNumeric = /^\d{0,9}$/.test(raw);
  const needsPin = raw.length > 0 && !looksNumeric;
  const canSubmit = raw.length >= 9 && !redeem.isPending && (!needsPin || pin.trim().length > 0);

  if (!session) return null;

  return (
    <div className="mt-4 rounded-[12px] border border-line bg-surface p-4">
      <p className="font-display text-h2">Redeem a code</p>
      <p className="mt-1 text-caption text-muted">
        Add a gift card's balance to your CADO card.
      </p>

      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setDone(null);
          redeem.mutate(
            { code, pin: needsPin ? pin : undefined },
            { onSuccess: (r) => { setDone(r); setCode(""); setPin(""); } }
          );
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(formatCodeInput(e.target.value))}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="333-333-333"
          aria-label="Gift card code"
          className="h-12 w-full rounded-[4px] border border-line bg-canvas px-3 font-mono text-[16px] tracking-[0.12em] text-ink outline-none transition focus:border-ink/40"
        />

        {needsPin ? (
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="PIN"
            aria-label="Gift card PIN"
            className="h-12 w-full rounded-[4px] border border-line bg-canvas px-3 font-mono text-[16px] tracking-[0.12em] text-ink outline-none transition focus:border-ink/40"
          />
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 rounded-[4px] bg-persimmon text-body font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-surface-sunk disabled:text-muted"
        >
          {redeem.isPending ? "Redeeming…" : "Redeem"}
        </button>
      </form>

      {done ? (
        <p className="mt-3 text-caption font-medium text-ink">
          {formatMoney(done.redeemed)} added. Your balance is now {formatMoney(done.newBalance)}.
        </p>
      ) : null}

      {redeem.isError ? (
        <p className="mt-3 text-caption text-persimmon">
          {(redeem.error as Error)?.message ?? "That code is not valid, or has already been used."}
        </p>
      ) : null}
    </div>
  );
}
