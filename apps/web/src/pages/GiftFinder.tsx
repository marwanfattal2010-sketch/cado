import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RECIPIENTS, OCCASION_SLUGS, BUDGET_TIERS } from "@cado/shared";

const RECIPIENT_LABELS: Record<string, string> = {
  mother: "Mother",
  father: "Father",
  friend: "Friend",
  partner: "Partner",
  child: "Child",
  sibling: "Sibling",
  colleague: "Colleague",
};

const OCCASION_LABELS: Record<string, string> = {
  birthday: "Birthday",
  wedding: "Wedding",
  graduation: "Graduation",
  anniversary: "Anniversary",
  valentine: "Valentine's Day",
  newborn: "Newborn",
  housewarming: "Housewarming",
  eid: "Eid",
  "mothers-day": "Mother's Day",
};

export function GiftFinder() {
  const [step, setStep] = useState(0);
  const [recipient, setRecipient] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string | null>(null);
  const navigate = useNavigate();

  const steps = ["Who is this gift for?", "What's the occasion?", "What's your budget?"];

  const pickBudget = (min: number, max: number) => {
    navigate(`/gift-finder/results?recipient=${recipient}&occasion=${occasion}&min=${min}&max=${max}`);
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm tracking-widest text-ink/40">STEP {step + 1} OF 3</p>
      <h1 className="mt-2 font-display text-3xl">{steps[step]}</h1>

      {step === 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {RECIPIENTS.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRecipient(r);
                setStep(1);
              }}
              className="rounded-2xl border border-ink/10 py-6 text-sm font-medium hover:border-ink/40"
            >
              {RECIPIENT_LABELS[r] ?? r}
            </button>
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {OCCASION_SLUGS.map((o) => (
            <button
              key={o}
              onClick={() => {
                setOccasion(o);
                setStep(2);
              }}
              className="rounded-2xl border border-ink/10 py-6 text-sm font-medium hover:border-ink/40"
            >
              {OCCASION_LABELS[o] ?? o}
            </button>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-8 grid grid-cols-2 gap-3">
          {BUDGET_TIERS.map((tier) => (
            <button
              key={tier.label}
              onClick={() => pickBudget(tier.min, tier.max)}
              className="rounded-2xl border border-ink/10 py-6 text-sm font-medium hover:border-ink/40"
            >
              {tier.label}
            </button>
          ))}
        </div>
      ) : null}

      {step > 0 ? (
        <button onClick={() => setStep(step - 1)} className="mt-8 text-sm text-ink/40 hover:text-ink">
          ← Back
        </button>
      ) : null}
    </div>
  );
}
