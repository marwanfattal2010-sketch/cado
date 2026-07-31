import { useState } from "react";
import { Link } from "react-router-dom";
import { useGiftFinderProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";

const BUDGETS = [
  { label: "$10 – $30", min: 10, max: 30 },
  { label: "$30 – $65", min: 30, max: 65 },
  { label: "$65 – $120", min: 65, max: 120 },
  { label: "$120 – $200", min: 120, max: 200 },
  { label: "$200+", min: 200, max: null },
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

export function GiftFinder() {
  const [budget, setBudget] = useState<(typeof BUDGETS)[number] | null>(null);
  const [recipient, setRecipient] = useState<string | null>(null);

  const results = useGiftFinderProducts(budget?.min ?? 0, budget?.max ?? null, recipient ?? "");

  if (!budget) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-accent text-4xl italic sm:text-5xl">What's your budget?</h1>
        <div className="mt-10 flex flex-col gap-3">
          {BUDGETS.map((b) => (
            <button
              key={b.label}
              onClick={() => setBudget(b)}
              className="rounded-full border border-ink/15 bg-white/40 py-4 text-lg font-medium transition hover:border-ink hover:bg-white/70"
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!recipient) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-accent text-4xl italic sm:text-5xl">Who's it for?</h1>
        <div className="mt-10 grid grid-cols-2 gap-3">
          {RECIPIENTS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRecipient(r.value)}
              className="rounded-full border border-ink/15 bg-white/40 py-4 text-lg font-medium transition hover:border-ink hover:bg-white/70"
            >
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={() => setBudget(null)} className="mt-8 text-sm text-ink/50 underline">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="text-center">
        <h1 className="font-accent text-4xl italic sm:text-5xl">Gifts for them</h1>
        <p className="mt-2 text-sm text-ink/50">
          {budget.label} · {RECIPIENTS.find((r) => r.value === recipient)?.label}
        </p>
        <button
          onClick={() => {
            setBudget(null);
            setRecipient(null);
          }}
          className="mt-3 text-sm text-ink/50 underline"
        >
          Start over
        </button>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        {results.data?.map((p) => (
          <ProductCard key={p.id} {...p} />
        ))}
      </div>

      {results.data?.length === 0 ? (
        <div className="mt-10 text-center text-ink/50">
          <p>No exact matches yet in that range — try browsing by category instead.</p>
          <Link to="/browse" className="mt-4 inline-block rounded-full bg-ink px-8 py-3 text-sm text-cream">
            Browse all categories
          </Link>
        </div>
      ) : null}
    </div>
  );
}
