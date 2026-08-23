import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCreatePool } from "../hooks/useGiftCardPools";
import { Button, ButtonLink } from "../components/ui";
import { PersimmonCard } from "../components/giftcard/PersimmonCard";
import { formatMoney } from "../lib/money";

const FIELD =
  "w-full rounded-[10px] border border-line bg-surface px-3 py-2.5 text-body outline-none transition focus:border-ink/35";

/** Matches the CHECK on gift_card_pools.goal_cents. */
const MIN_GOAL = 25;
const MAX_MESSAGE = 120;

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</p>;
}

/**
 * Start a group gift, on one screen.
 *
 * The organizer is asked for a first name only: the group page is public to
 * anyone holding the link, and a full name on a public page is more than
 * anyone needed to share.
 *
 * The card preview shows what has actually been COLLECTED, which at this
 * moment is nothing — $0 of the goal. Showing the goal on the card face would
 * be showing money that does not exist yet.
 */
export function GiftCardGroupCreate() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const create = useCreatePool();

  const [recipient, setRecipient] = useState("");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [to, setTo] = useState("");
  const [from, setFrom] = useState(profile?.full_name ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h2">Start a group gift</h1>
        <p className="mt-2 text-body text-muted">
          Log in first — you'll be the organizer, and only you can send the card at the end.
        </p>
        <ButtonLink to="/login" variant="accent" className="mt-6">
          Log in
        </ButtonLink>
      </div>
    );
  }

  const goalNumber = Number(goal);

  const submit = async () => {
    setError(null);
    if (!recipient.trim()) return setError("Who is the gift for?");
    if (!goalNumber || goalNumber < MIN_GOAL) return setError(`The goal needs to be at least $${MIN_GOAL}.`);
    try {
      const slug = await create.mutateAsync({
        recipientName: recipient.trim(),
        // The database column stays; "just-because" is the value that claims
        // nothing, which is the truth now that nobody is asked.
        occasion: "just-because",
        goalCents: Math.round(goalNumber * 100),
        deadline: deadline || null,
        noteTo: to.trim() || recipient.trim(),
        noteFrom: from.trim() || null,
        noteMessage: message.trim() || null,
      });
      navigate(`/gift-cards/group/${slug}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col px-5 pb-4 pt-4">
      <h1 className="font-display text-h2">Start a group gift</h1>
      <p className="mt-1 text-caption text-muted">Set a goal, share the link, everyone chips in.</p>

      <div className="mt-3 flex gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
            Who's it for
          </span>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="First name"
            className={FIELD}
          />
        </label>
        <label className="w-[42%]">
          <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
            Goal
          </span>
          <div className="flex items-center gap-1 rounded-[10px] border border-line bg-surface px-3">
            <span className="text-body text-muted">$</span>
            <input
              type="number"
              inputMode="decimal"
              min={MIN_GOAL}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="900"
              aria-label="Goal amount in dollars"
              className="w-full bg-transparent py-2.5 text-body outline-none"
            />
          </div>
        </label>
      </div>
      <p className="mt-1 text-[11px] text-muted">At least ${MIN_GOAL}. Up to 20 people can chip in.</p>

      {/* Collected so far — which right now is nothing, and says so. */}
      <div className="mt-3">
        <PersimmonCard amount={formatMoney(0)} label="COLLECTED SO FAR" note="Everyone who chips in adds to this." />
      </div>

      <div className="mt-3">
        <Label>The note</Label>
        <div className="mt-1.5 flex gap-2">
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To"
            aria-label="Recipient's name on the card"
            className={FIELD}
          />
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="From"
            aria-label="Your name"
            className={FIELD}
          />
        </div>
        <input
          value={message}
          maxLength={MAX_MESSAGE}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message (optional)"
          aria-label="Message"
          className={`mt-2 ${FIELD}`}
        />
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
          Deadline (optional)
        </span>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={FIELD} />
      </label>

      {error ? (
        <p role="alert" className="mt-2 text-caption text-alert">
          {error}
        </p>
      ) : null}

      <Button onClick={submit} disabled={create.isPending} variant="accent" fullWidth className="mt-3">
        {create.isPending ? "Creating…" : "Create group"}
      </Button>
      {/* Clear of the pinned bottom nav. */}
      <div className="h-20" />
    </div>
  );
}
