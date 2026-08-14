import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatMoney } from "../lib/money";
import { useAuth } from "../lib/auth";
import { useContribute, usePool } from "../hooks/useGiftCardPools";
import { Button, ButtonLink, Chip } from "../components/ui";

const QUICK = [25, 50, 100];
const OMT_NUMBER = "81 900 002";
const MESSAGE_MAX = 120;

const FIELD =
  "w-full rounded-card border border-line bg-surface px-4 py-3.5 text-body outline-none transition focus:border-ink/35";

const money = (cents: number) => formatMoney(cents / 100);

/**
 * Chipping in.
 *
 * The money moves outside CADO — the contributor transfers by OMT and types
 * the reference in here. Nothing on this screen marks anything paid: the
 * contribution is saved as pending and stays pending until a human at CADO
 * confirms the transfer arrived. That is the whole reason there is a
 * reference field and no "Pay" button.
 */
export function GiftCardGroupChipIn() {
  const { slug } = useParams<{ slug: string }>();
  const { profile } = useAuth();
  const pool = usePool(slug);
  const contribute = useContribute(slug);

  const [name, setName] = useState(profile?.full_name ?? "");
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [hideAmount, setHideAmount] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (pool.isLoading) {
    return (
      <div className="mx-auto max-w-lg px-5 py-10" aria-busy="true">
        <div className="skeleton h-6 w-48 rounded-pill" />
      </div>
    );
  }

  if (!pool.data) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Group gift not found</h1>
        <ButtonLink to="/gift-cards" variant="accent" className="mt-6">
          Gift cards
        </ButtonLink>
      </div>
    );
  }

  const p = pool.data;
  const remaining = Math.max(0, p.goal_cents - p.confirmed_cents - p.pending_cents);
  const chosen = customAmount ? Number(customAmount) : amount;

  if (done) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Thanks{name ? `, ${name.split(" ")[0]}` : ""}</h1>
        <p className="mt-3 text-body text-muted">
          We'll confirm your payment and it'll show on the group page.
        </p>
        <ButtonLink to={`/gift-cards/group/${p.slug}`} variant="accent" className="mt-6">
          Back to the group
        </ButtonLink>
      </div>
    );
  }

  if (p.status !== "open") {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">This group is closed</h1>
        <p className="mt-3 text-body text-muted">No more contributions can be added.</p>
        <ButtonLink to={`/gift-cards/group/${p.slug}`} variant="accent" className="mt-6">
          See the group
        </ButtonLink>
      </div>
    );
  }

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Please add your name.");
    if (!chosen || chosen < 5) return setError("The smallest amount is $5.");
    if (!reference.trim()) return setError("Add your OMT reference number so we can match your transfer.");
    try {
      await contribute.mutateAsync({
        contributorName: name.trim(),
        amountCents: Math.round(chosen * 100),
        paymentRef: reference.trim(),
        message: message.trim() || undefined,
        hideAmount,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <h1 className="font-display text-h1">Chip in</h1>
      <p className="mt-2 text-body text-muted">
        For {p.recipient_name} · {money(remaining)} left to reach {money(p.goal_cents)}
      </p>

      <section className="mt-7">
        <label className="block">
          <span className="mb-1 block text-caption text-muted">Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" className={FIELD} />
        </label>
      </section>

      <section className="mt-6">
        <p className="text-body font-medium">Amount</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {QUICK.map((a) => (
            <button
              key={a}
              type="button"
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
          inputMode="decimal"
          min={5}
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          placeholder="Or another amount"
          aria-label="Another amount in dollars"
          className={`mt-3 ${FIELD}`}
        />
        <p className="mt-1.5 text-caption text-muted">Remaining: {money(remaining)}</p>
      </section>

      <section className="mt-6">
        <label className="block">
          <span className="mb-1 block text-caption text-muted">A short message (optional)</span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
            maxLength={MESSAGE_MAX}
            placeholder="Happy birthday!"
            className={FIELD}
          />
        </label>
      </section>

      <label className="mt-4 flex min-h-[44px] items-center gap-3 text-body">
        <input
          type="checkbox"
          checked={hideAmount}
          onChange={(e) => setHideAmount(e.target.checked)}
          className="h-5 w-5 accent-[color:rgb(var(--persimmon))]"
        />
        Hide my amount from the others
      </label>

      <section className="mt-7 rounded-[16px] border border-line bg-surface p-5">
        <h2 className="font-display text-h2">Paying</h2>
        <p className="mt-2 text-body text-muted">
          Send {chosen ? formatMoney(chosen) : "your amount"} by OMT to{" "}
          <span className="font-medium text-ink">{OMT_NUMBER}</span>, then put the reference number below.
        </p>
        <p className="mt-2 text-caption text-muted">
          Your contribution shows as waiting until someone at CADO checks the transfer arrived. It only counts
          toward the goal once that's done.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-caption text-muted">OMT reference number</span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="From your OMT receipt"
            className={FIELD}
          />
        </label>
      </section>

      {error ? (
        <p role="alert" className="mt-6 text-body text-alert">
          {error}
        </p>
      ) : null}

      <Button onClick={submit} disabled={contribute.isPending} variant="accent" fullWidth className="mt-6">
        {contribute.isPending ? "Adding…" : "I've sent it"}
      </Button>

      <p className="mt-4 text-center text-caption text-muted">
        <Link to={`/gift-cards/group/${p.slug}`} className="underline underline-offset-4">
          Back to the group
        </Link>
      </p>
      <div className="h-24" />
    </div>
  );
}
