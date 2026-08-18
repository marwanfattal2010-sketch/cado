import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { formatMoney } from "../../lib/money";
import { useAuth } from "../../lib/auth";
import { useToast } from "../ui";
import { formatCodeInput, normaliseCode, useRedeemToWallet } from "../../hooks/useWallet";

/**
 * "Redeem a code" — the ONE place a gift card becomes balance.
 *
 * TWO FORMATS, ON PURPOSE. Current cards carry twelve digits and the input
 * groups them XXXX-XXXX-XXXX as you type. Cards sold before the change carry
 * twenty alphanumeric characters, and those pass through the formatter
 * untouched — regrouping them would make people think they had mistyped.
 * Pasting works for both, dashes or no dashes.
 *
 * THE PIN FIELD IS NOT OPTIONAL DECORATION. Older cards were sold with a
 * PIN and the server still demands it for them: a code alone must not move
 * money that someone paid for. New numeric codes have no PIN, so the field
 * only appears once what has been typed stops looking like one.
 *
 * Nothing here decides whether a code is valid. It normalises, sends, and
 * reports what the database said — which returns one identical message for
 * every kind of failure, so this screen cannot leak which part was wrong.
 */
export function RedeemToWallet({ onRedeemed }: { onRedeemed?: (amount: number) => void }) {
  const { session } = useAuth();
  const redeem = useRedeemToWallet();
  const toast = useToast();
  // Group-gift share links arrive as /gift-cards?code=… (via the old
  // /gift-cards/redeem redirect, which keeps its query). Prefill so the
  // person the card was sent to lands with their code already in the box.
  const [params] = useSearchParams();
  const [code, setCode] = useState(() => formatCodeInput(params.get("code") ?? ""));
  const [pin, setPin] = useState("");

  const raw = normaliseCode(code);
  /** A twelve-digit code needs no PIN; anything longer is an older card. */
  const looksNumeric = /^\d{0,12}$/.test(raw);
  const needsPin = raw.length > 0 && !looksNumeric;
  const canSubmit = raw.length >= 12 && !redeem.isPending && (!needsPin || pin.trim().length > 0);

  if (!session) {
    // A person holding a gift link lands here logged out. Hiding the box
    // entirely would leave them staring at a page that never mentions the
    // thing their link promised.
    return (
      <div className="mt-7 rounded-[14px] border border-line bg-surface p-5">
        <p className="font-display text-h2">Redeem a code</p>
        <p className="mt-1 text-caption text-muted">
          Log in and your gift card's value goes onto your own CADO card.
        </p>
        <a
          href="/login"
          className="mt-4 inline-flex h-11 items-center rounded-[4px] bg-persimmon px-5 text-caption font-semibold text-white"
        >
          Log in
        </a>
      </div>
    );
  }

  return (
    <div className="mt-7 rounded-[14px] border border-line bg-surface p-5">
      <p className="font-display text-h2">Redeem a code</p>
      <p className="mt-1 text-caption text-muted">
        Got a CADO gift card? Its value goes onto your card the moment you redeem it.
      </p>

      <form
        className="mt-4 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          redeem.mutate(
            { code, pin: needsPin ? pin : undefined },
            {
              onSuccess: (r) => {
                setCode("");
                setPin("");
                toast(`Added ${formatMoney(r.redeemed)} to your CADO balance`);
                onRedeemed?.(r.redeemed);
              },
            }
          );
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(formatCodeInput(e.target.value))}
          /* Numeric keyboard for the numeric codes; letters from an older
             code still arrive fine by paste, and by keyboard-switching for
             the few who type one by hand. */
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          placeholder="XXXX-XXXX-XXXX"
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

      {redeem.isError ? (
        <p className="mt-3 text-caption text-persimmon">
          {(redeem.error as Error)?.message ?? "That code is not valid, or has already been used."}
        </p>
      ) : null}
    </div>
  );
}
