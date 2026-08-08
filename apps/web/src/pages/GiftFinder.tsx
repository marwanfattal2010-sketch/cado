import { useState } from "react";
import { Link } from "react-router-dom";
import { useGiftFinderProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { ChevronLeftIcon } from "../components/Icons";

const BUDGETS = [
  { label: "Under $30", min: 0, max: 30 },
  { label: "$30 – $50", min: 30, max: 50 },
  { label: "$50 – $70", min: 50, max: 70 },
  { label: "$70 – $100", min: 70, max: 100 },
  { label: "$100 – $150", min: 100, max: 150 },
  { label: "$150+", min: 150, max: null as number | null },
];

const RECIPIENTS = [
  { label: "Mother", value: "mother" },
  { label: "Father", value: "father" },
  { label: "Partner", value: "partner" },
  { label: "Sibling", value: "sibling" },
  { label: "Friend", value: "friend" },
  { label: "Colleague", value: "colleague" },
  { label: "Child", value: "child" },
];

type Budget = (typeof BUDGETS)[number];

function StepHeader({
  step,
  title,
  subtitle,
  onBack,
}: {
  step: 1 | 2;
  title: string;
  subtitle: string;
  onBack?: () => void;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-ink/50 transition-all duration-150 hover:bg-ink/5 hover:text-ink active:scale-90"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
        ) : null}
        <span className="text-[11px] font-semibold tracking-[0.18em] text-ink/35">STEP {step} OF 2</span>
      </div>

      {/* Two-segment progress rail — reads as progress at a glance without
          adding another heavy element to the page. */}
      <div className="mt-3 flex gap-1.5">
        <span className="h-[3px] flex-1 rounded-full bg-ink" />
        <span className={`h-[3px] flex-1 rounded-full ${step === 2 ? "bg-ink" : "bg-ink/12"}`} />
      </div>

      <h1 className="mt-6 font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
      <p className="mt-1.5 text-sm text-ink/50">{subtitle}</p>
    </div>
  );
}

const optionClass =
  "rounded-2xl bg-white px-4 py-4 text-sm font-medium text-ink ring-1 ring-ink/8 shadow-[0_1px_2px_rgba(23,20,15,0.04)] transition-all duration-150 hover:ring-ink/25 hover:shadow-[0_2px_8px_rgba(23,20,15,0.07)] active:scale-[0.97]";

export function GiftFinder() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [recipient, setRecipient] = useState<string | null>(null);

  const results = useGiftFinderProducts(budget?.min ?? 0, budget?.max ?? null, recipient ?? "");
  const recipientLabel = RECIPIENTS.find((r) => r.value === recipient)?.label;

  if (!budget) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10">
        <StepHeader
          step={1}
          title="What's your budget?"
          subtitle="We'll only show gifts in this range."
        />
        <div className="grid grid-cols-2 gap-2.5">
          {BUDGETS.map((b) => (
            <button key={b.label} onClick={() => setBudget(b)} className={optionClass}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!recipient) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10">
        <StepHeader
          step={2}
          title="Who's it for?"
          subtitle={`Budget: ${budget.label}`}
          onBack={() => setBudget(null)}
        />
        <div className="grid grid-cols-2 gap-2.5">
          {RECIPIENTS.map((r) => (
            <button key={r.value} onClick={() => setRecipient(r.value)} className={optionClass}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Gifts for them</h1>

      {/* Selections stay editable as chips — changing your mind shouldn't
          mean restarting the whole flow. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setBudget(null)}
          className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-ink/70 ring-1 ring-ink/10 transition-all duration-150 hover:ring-ink/25 active:scale-95"
        >
          {budget.label} <span className="ml-0.5 text-ink/30">✕</span>
        </button>
        <button
          onClick={() => setRecipient(null)}
          className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-ink/70 ring-1 ring-ink/10 transition-all duration-150 hover:ring-ink/25 active:scale-95"
        >
          {recipientLabel} <span className="ml-0.5 text-ink/30">✕</span>
        </button>
        {!results.isLoading ? (
          <span className="text-xs text-ink/35">
            {results.data?.length ?? 0} {results.data?.length === 1 ? "match" : "matches"}
          </span>
        ) : null}
      </div>

      <div className="mt-7">
        {results.isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : results.data && results.data.length > 0 ? (
          <div className="grid animate-fade-in grid-cols-2 gap-5 md:grid-cols-4">
            {results.data.map((p) => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        ) : (
          <div className="py-14 text-center">
            <p className="font-display text-lg font-semibold">No matches yet</p>
            <p className="mx-auto mt-2 max-w-xs text-sm text-ink/50">
              Nothing in this range for {recipientLabel?.toLowerCase()} just yet. Try a wider budget, or
              browse by category.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setBudget(null)}
                className="rounded-full bg-ink px-7 py-3 text-sm text-cream transition-transform duration-150 active:scale-95"
              >
                Change budget
              </button>
              <Link
                to="/browse"
                className="rounded-full bg-white px-7 py-3 text-sm font-medium text-ink ring-1 ring-ink/12 transition-transform duration-150 active:scale-95"
              >
                Browse categories
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
