import { Link, useSearchParams } from "react-router-dom";
import { useGiftFinderProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { ChevronLeftIcon } from "../components/Icons";
import { BUDGETS, RECIPIENTS, budgetBySlug, recipientByValue } from "../lib/filters";

/**
 * Filters live in the URL, so arriving from a homepage shortcut with one
 * already chosen (?budget= or ?recipient=) drops you straight into results
 * instead of asking again. Landing here with nothing set starts the
 * two-step flow.
 */
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

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-ink/70 ring-1 ring-ink/10 transition-all duration-150 hover:ring-ink/25 active:scale-95"
    >
      {label} <span className="ml-0.5 text-ink/30">✕</span>
    </button>
  );
}

export function GiftFinder() {
  const [params, setParams] = useSearchParams();

  const budget = budgetBySlug(params.get("budget"));
  const recipient = recipientByValue(params.get("recipient"));
  const hasAnyFilter = !!budget || !!recipient;

  const setFilter = (key: "budget" | "recipient", value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    // Choosing a value answers the question, so clear the picker flag.
    if (key === "recipient" && value) next.delete("pick");
    setParams(next, { replace: true });
  };

  const openRecipientPicker = () => {
    const next = new URLSearchParams(params);
    next.set("pick", "recipient");
    setParams(next, { replace: true });
  };

  const results = useGiftFinderProducts({
    recipient: recipient?.value,
    minPrice: budget?.min,
    maxPrice: budget?.max,
  });

  const pickingRecipient = params.get("pick") === "recipient" && !recipient;

  // Step 1 — nothing chosen yet.
  if (!hasAnyFilter && !pickingRecipient) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10">
        <StepHeader step={1} title="What's your budget?" subtitle="We'll only show gifts in this range." />
        <div className="grid grid-cols-2 gap-2.5">
          {BUDGETS.map((b) => (
            <button key={b.slug} onClick={() => setFilter("budget", b.slug)} className={optionClass}>
              {b.label}
            </button>
          ))}
        </div>
        <button
          onClick={openRecipientPicker}
          className="mt-5 w-full text-center text-sm text-ink/45 underline underline-offset-2"
        >
          Skip — any budget
        </button>
      </div>
    );
  }

  // Step 2 — recipient picker. Only reached deliberately (through step 1, or
  // the "Who's it for?" button on the results page); arriving from a homepage
  // shortcut skips straight past this to results.
  if (pickingRecipient) {
    return (
      <div className="mx-auto max-w-lg px-6 py-10">
        <StepHeader
          step={2}
          title="Who's it for?"
          subtitle={budget ? `Budget: ${budget.label}` : "Any budget"}
          onBack={() => {
            const next = new URLSearchParams(params);
            next.delete("pick");
            next.delete("budget");
            setParams(next, { replace: true });
          }}
        />
        <div className="grid grid-cols-2 gap-2.5">
          {RECIPIENTS.map((r) => (
            <button key={r.value} onClick={() => setFilter("recipient", r.value)} className={optionClass}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const title = recipient ? `Gifts ${recipient.label.toLowerCase()}` : "Gifts for them";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>

      {/* Whatever is set shows as a removable chip; whatever isn't offers a
          one-tap way to narrow further. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {budget ? <Chip label={budget.label} onRemove={() => setFilter("budget", null)} /> : null}
        {recipient ? <Chip label={recipient.label} onRemove={() => setFilter("recipient", null)} /> : null}

        {!recipient ? (
          <button
            onClick={openRecipientPicker}
            className="rounded-full bg-ink/5 px-3.5 py-1.5 text-xs font-medium text-ink/60 transition-all duration-150 hover:bg-ink/10 active:scale-95"
          >
            + Who's it for?
          </button>
        ) : null}

        {!results.isLoading ? (
          <span className="text-xs text-ink/35">
            {results.data?.length ?? 0} {results.data?.length === 1 ? "gift" : "gifts"}
          </span>
        ) : null}
      </div>

      {/* Budget refine row, shown when browsing by recipient only. */}
      {!budget ? (
        <div className="scroll-row -mx-6 mt-4 gap-2 px-6">
          {BUDGETS.map((b) => (
            <button
              key={b.slug}
              onClick={() => setFilter("budget", b.slug)}
              className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-medium text-ink/70 ring-1 ring-ink/10 transition-all duration-150 hover:ring-ink/25 active:scale-95"
            >
              {b.label}
            </button>
          ))}
        </div>
      ) : null}

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
              Nothing here just yet. Try a wider budget, or browse by category.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {budget ? (
                <button
                  onClick={() => setFilter("budget", null)}
                  className="rounded-full bg-ink px-7 py-3 text-sm text-cream transition-transform duration-150 active:scale-95"
                >
                  Clear budget
                </button>
              ) : null}
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
