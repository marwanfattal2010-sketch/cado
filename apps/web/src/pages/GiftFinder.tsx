import { Link, useSearchParams } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { ChevronLeftIcon } from "../components/Icons";
import { RibbonEmpty } from "../components/ui";
import { BUDGETS, RECIPIENTS, OCCASIONS, budgetBySlug, recipientByValue, occasionByValue } from "../lib/filters";
import { useGiftFinderResults } from "../hooks/useGiftFinder";

/**
 * Three questions, no more — each extra one loses people. Answers live in
 * the URL so back/forward preserves them and a homepage shortcut can jump
 * straight past a step it already knows.
 */
function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="mt-3 flex gap-1.5">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-[3px] flex-1 rounded-pill ${i <= step ? "bg-ribbon" : "bg-surface-sunk"}`} />
      ))}
    </div>
  );
}

function StepShell({
  step,
  title,
  subtitle,
  onBack,
  children,
}: {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-pill text-muted transition hover:bg-surface-sunk hover:text-ink"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
        ) : null}
        <span className="text-eyebrow uppercase text-muted">Step {step} of 3</span>
      </div>
      <Progress step={step} />
      <h1 className="mt-5 font-display text-h1">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-body text-muted">{subtitle}</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-2.5">{children}</div>
    </div>
  );
}

const OPTION =
  "rounded-card bg-surface px-4 py-4 text-body font-medium text-ink shadow-rest transition-all duration-fast hover:shadow-lift active:scale-[0.97]";

export function GiftFinder() {
  const [params, setParams] = useSearchParams();

  const recipient = recipientByValue(params.get("recipient"));
  const occasion = occasionByValue(params.get("occasion"));
  const budget = budgetBySlug(params.get("budget"));

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: false });
  };

  const results = useGiftFinderResults({
    recipient: recipient?.value,
    occasion: occasion?.value,
    budget: budget?.slug,
  });

  // Step 1 — who
  if (!recipient) {
    return (
      <StepShell step={1} title="Who's it for?" subtitle="We'll narrow it down from here.">
        {RECIPIENTS.map((r) => (
          <button key={r.value} onClick={() => set("recipient", r.value)} className={OPTION}>
            {r.label}
          </button>
        ))}
      </StepShell>
    );
  }

  // Step 2 — occasion
  if (!occasion) {
    return (
      <StepShell
        step={2}
        title="What's the occasion?"
        subtitle={recipient.label}
        onBack={() => set("recipient", null)}
      >
        {OCCASIONS.map((o) => (
          <button key={o.value} onClick={() => set("occasion", o.value)} className={OPTION}>
            {o.label}
          </button>
        ))}
      </StepShell>
    );
  }

  // Step 3 — budget
  if (!budget) {
    return (
      <StepShell
        step={3}
        title="What's your budget?"
        subtitle={`${recipient.label} · ${occasion.label}`}
        onBack={() => set("occasion", null)}
      >
        {BUDGETS.map((b) => (
          <button key={b.slug} onClick={() => set("budget", b.slug)} className={OPTION}>
            {b.label}
          </button>
        ))}
      </StepShell>
    );
  }

  const items = results.data?.items ?? [];
  const relaxed = results.data?.relaxed ?? null;

  // Repeat their answers back — it makes the result feel deliberate. But
  // only claim the budget when the results actually honour it; asserting
  // "$20-$50" above a row of $65 items reads as broken.
  const who = recipient.label.replace(/^For (a |your )?/i, "").toLowerCase();
  const count = `${items.length} ${items.length === 1 ? "gift" : "gifts"}`;
  const headline =
    relaxed === "budget" || relaxed === "staff-picks"
      ? `${count} for ${who}`
      : `${count} for ${who}, ${budget.label.toLowerCase()}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-display text-h1">{results.isLoading ? "Finding gifts…" : headline}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[
          { label: recipient.label, key: "recipient" },
          { label: occasion.label, key: "occasion" },
          { label: budget.label, key: "budget" },
        ].map((c) => (
          <button
            key={c.key}
            onClick={() => set(c.key, null)}
            className="inline-flex h-8 items-center rounded-pill bg-surface px-3.5 text-caption font-medium text-ink/70 shadow-rest transition active:scale-95"
          >
            {c.label} <span className="ml-1 text-muted">✕</span>
          </button>
        ))}
      </div>

      {/* Say so when the search was widened, rather than quietly showing
          something that doesn't match what was asked for. */}
      {relaxed === "budget" ? (
        <p className="mt-3 text-caption text-muted">
          Nothing in that exact range — showing the closest matches instead.
        </p>
      ) : relaxed === "occasion" ? (
        <p className="mt-3 text-caption text-muted">
          Few {occasion.label.toLowerCase()} gifts for {who} yet — showing what else suits them.
        </p>
      ) : relaxed === "staff-picks" ? (
        <p className="mt-3 text-caption text-muted">Nothing matched exactly, so here are our staff picks.</p>
      ) : null}

      <div className="mt-6">
        {results.isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : items.length > 0 ? (
          <div className="grid animate-fade-in grid-cols-2 gap-3 md:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} {...(p as Parameters<typeof ProductCard>[0])} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <RibbonEmpty className="mx-auto h-14 w-14" />
            <p className="mt-3 font-display text-h2">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-xs text-body text-muted">
              Try a wider budget, or browse by category.
            </p>
            <Link
              to="/browse"
              className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-ribbon px-7 text-body font-medium text-inverse"
            >
              Browse categories
            </Link>
          </div>
        )}
      </div>

      {/* The gift card belongs here, at the end — not as the first thing
          offered to someone who said they don't know what to get. */}
      <div className="mt-8 flex items-center justify-between gap-4 rounded-card bg-ink px-5 py-4 text-inverse">
        <p className="text-body">Still stuck? Send a gift card.</p>
        <Link
          to="/gift-cards/send"
          className="shrink-0 rounded-pill bg-canvas px-5 py-2.5 text-caption font-medium text-ink"
        >
          Send one
        </Link>
      </div>
    </div>
  );
}
