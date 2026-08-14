import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useCreatePool } from "../hooks/useGiftCardPools";
import { Button, ButtonLink, Chip } from "../components/ui";
import { GiftNoteBlock, OCCASIONS, suggestionFor, type NoteValue, type Occasion } from "../components/giftcard/GiftNote";

const FIELD =
  "w-full rounded-card border border-line bg-surface px-4 py-3.5 text-body outline-none transition focus:border-ink/35";

/** Matches the CHECK on gift_card_pools.goal_cents. */
const MIN_GOAL = 25;

/**
 * One screen, no wizard. Four questions and a button.
 *
 * The organizer is asked for a first name only, because the group page is
 * public to anyone holding the link and a full name on a public page is more
 * than anyone needed to share.
 */
export function GiftCardGroupCreate() {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const create = useCreatePool();

  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState<Occasion>("birthday");
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [note, setNote] = useState<NoteValue>({
    to: "",
    from: profile?.full_name ?? "",
    message: suggestionFor("birthday", ""),
  });
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Start a group gift</h1>
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
        occasion,
        goalCents: Math.round(goalNumber * 100),
        deadline: deadline || null,
        noteTo: note.to.trim() || recipient.trim(),
        noteFrom: note.from.trim() || null,
        noteMessage: note.message.trim() || null,
      });
      navigate(`/gift-cards/group/${slug}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <h1 className="font-display text-h1">Start a group gift</h1>
      <p className="mt-2 text-body text-muted">
        Set a goal, share the link, and everyone puts in what they can. When it's covered, you send one card.
      </p>

      <section className="mt-7">
        <label className="block">
          <span className="mb-1 block text-caption text-muted">Who's it for</span>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="First name"
            className={FIELD}
          />
        </label>
      </section>

      <section className="mt-6">
        <p className="text-body font-medium">Occasion</p>
        <div className="scroll-row mt-3" style={{ ["--row-gap" as string]: "8px" }}>
          {OCCASIONS.map((o) => (
            <Chip key={o.value} active={occasion === o.value} onClick={() => setOccasion(o.value)}>
              {o.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <p className="text-body font-medium">Goal amount</p>
        <div className="mt-3 flex items-center gap-2 rounded-card border border-line bg-surface px-4">
          <span className="font-display text-h1 text-muted">$</span>
          <input
            type="number"
            inputMode="decimal"
            min={MIN_GOAL}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="900"
            aria-label="Goal amount in dollars"
            className="w-full bg-transparent py-3 font-display text-h1 outline-none"
          />
        </div>
        <p className="mt-1.5 text-caption text-muted">At least ${MIN_GOAL}. Up to 20 people can chip in.</p>
      </section>

      <section className="mt-6">
        <label className="block">
          <span className="mb-1 block text-caption text-muted">Deadline (optional)</span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={FIELD}
          />
        </label>
      </section>

      <GiftNoteBlock occasion={occasion} value={note} onChange={setNote} heading="The note on the card" />

      {error ? (
        <p role="alert" className="mt-6 text-body text-alert">
          {error}
        </p>
      ) : null}

      <Button onClick={submit} disabled={create.isPending} variant="accent" fullWidth className="mt-8">
        {create.isPending ? "Creating…" : "Create group"}
      </Button>
      <div className="h-24" />
    </div>
  );
}
