import { Link, useSearchParams } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { ChevronLeftIcon, GiftIcon } from "../components/Icons";
import { Chip, RemovableChip, RibbonEmpty } from "../components/ui";
import { BUDGETS, QUIZ_RECIPIENTS, budgetBySlug, occasionByValue, recipientLabel } from "../lib/filters";
import { useGiftResults } from "../hooks/useGiftFinder";

/**
 * Two questions, and neither of them blocks.
 *
 * Which screen you get is decided by the URL alone, so every entry point is
 * a plain link and the back button always does the obvious thing:
 *
 *   /gift-finder                     -> step 1 (who)
 *   /gift-finder?recipient=x&step=2  -> step 2 (budget)
 *   anything else                    -> results
 *
 * That last rule is what makes the homepage chips work. An occasion chip
 * links to /gift-finder?occasion=birthday and lands straight on a grid — it
 * never asks a question it was just told the answer to.
 */

function Progress({ step }: { step: 1 | 2 }) {
  return (
    <div className="mt-3 flex gap-1.5" aria-hidden>
      {[1, 2].map((i) => (
        <span
          key={i}
          className={`h-[3px] flex-1 rounded-pill ${i <= step ? "bg-primary" : "bg-surface-sunk"}`}
        />
      ))}
    </div>
  );
}

function StepShell({
  step,
  title,
  subtitle,
  onBack,
  onSkip,
  children,
}: {
  step: 1 | 2;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onSkip: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            /* h-11 = 44px. NOT h-8: this project's spacing scale maps 8 to
               64px, which built a back button the size of a thumbnail. */
            className="-ml-1 flex h-11 w-11 items-center justify-center rounded-pill text-muted transition hover:bg-surface-sunk hover:text-ink"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
        ) : null}
        <span className="text-eyebrow uppercase text-muted">Step {step} of 2</span>
        {/* Skip is visible on both steps. A quiz you can't leave is a wall,
            and this one sits between someone and the shop. */}
        <button
          onClick={onSkip}
          className="tap-44 ml-auto text-caption font-medium text-muted underline underline-offset-4 hover:text-ink"
        >
          Skip
        </button>
      </div>
      <Progress step={step} />
      <h1 className="mt-5 font-display text-h1">{title}</h1>
      {subtitle ? <p className="mt-1.5 text-body text-muted">{subtitle}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

/** Two-up option chips. Same two states as every other chip on the site:
 *  white with a hairline, or a charcoal fill. No photos — by this point the
 *  person has said they don't know what to get, so the screen should be a
 *  decision, not a mood board. */
const OPTION = "!h-[52px] flex-1 basis-[45%] !px-5";

export function GiftFinder() {
  const [params, setParams] = useSearchParams();

  const recipient = params.get("recipient");
  const occasion = occasionByValue(params.get("occasion"));
  const budget = budgetBySlug(params.get("budget"));
  const step = params.get("step");

  const answered = !!recipient || !!occasion || !!budget || params.get("skip") === "1";

  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v == null) p.delete(k);
      else p.set(k, v);
    }
    setParams(p);
  };

  const results = useGiftResults({
    recipient,
    occasion: occasion?.value ?? null,
    budget: budget?.slug ?? null,
  });

  // --- Step 1: who ---------------------------------------------------------
  if (!answered && step !== "2") {
    return (
      <StepShell
        step={1}
        title="Who's it for?"
        subtitle="Two quick taps, then gifts."
        onSkip={() => go({ skip: "1" })}
      >
        {QUIZ_RECIPIENTS.map((r) => (
          <Chip
            key={r.label}
            className={OPTION}
            onClick={() => go({ recipient: r.value, step: "2", skip: r.value ? null : "1" })}
          >
            {r.label}
          </Chip>
        ))}
      </StepShell>
    );
  }

  // --- Step 2: budget ------------------------------------------------------
  if (step === "2") {
    return (
      <StepShell
        step={2}
        title="What's your budget?"
        subtitle={recipientLabel(recipient) ?? "Anyone"}
        onBack={() => go({ recipient: null, step: null, skip: null })}
        onSkip={() => go({ step: null, skip: "1" })}
      >
        {BUDGETS.map((b) => (
          <Chip key={b.slug} className={OPTION} onClick={() => go({ budget: b.slug, step: null })}>
            {b.label}
          </Chip>
        ))}
      </StepShell>
    );
  }

  // --- Results -------------------------------------------------------------
  const items = results.data?.items ?? [];
  const totalBeforeBudget = results.data?.totalBeforeBudget ?? 0;
  const relaxed = results.data?.relaxed ?? null;

  // Only claim the occasion in the headline when the results actually honour
  // it. "47 gifts · Get Well" above a grid of untagged gifts reads as a
  // count of Get Well gifts, which is precisely what it isn't.
  const claimsOccasion = !!occasion && relaxed === null;
  const parts = [claimsOccasion ? occasion.label : null, recipientLabel(recipient), budget?.label].filter(
    Boolean
  );
  const count = `${items.length} ${items.length === 1 ? "gift" : "gifts"}`;
  const headline = parts.length ? `${count} · ${parts.join(" · ")}` : `${count} to choose from`;

  const activeChips = (
    [
      occasion ? { key: "occasion", label: occasion.label } : null,
      recipient ? { key: "recipient", label: recipientLabel(recipient) ?? recipient } : null,
      budget ? { key: "budget", label: budget.label } : null,
    ] as ({ key: string; label: string } | null)[]
  ).filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-display text-h1">{results.isLoading ? "Finding gifts…" : headline}</h1>

      {activeChips.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeChips.map((c) => (
            <RemovableChip key={c.key} onRemove={() => go({ [c.key]: null })}>
              {c.label}
            </RemovableChip>
          ))}
        </div>
      ) : null}

      {/* Say plainly when the answer isn't literally what was asked for.
          Quietly showing something else is how a filter loses its meaning. */}
      {relaxed === "occasion-untagged" && occasion ? (
        <p className="mt-3 text-caption text-muted">
          No gifts are tagged {occasion.label.toLowerCase()} yet — showing everything else that suits.
        </p>
      ) : relaxed === "occasion-thin" && occasion ? (
        <p className="mt-3 text-caption text-muted">
          Only a few {occasion.label.toLowerCase()} gifts so far — showing what else fits.
        </p>
      ) : null}

      <div className="mt-6">
        {results.isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : items.length > 0 ? (
          <>
            <div className="grid animate-fade-in grid-cols-2 gap-3 md:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.id} {...(p as unknown as Parameters<typeof ProductCard>[0])} />
              ))}
            </div>
            {/* Thin, but real. Never padded out with duplicates. */}
            {items.length < 4 ? (
              <p className="mt-5 text-caption text-muted">
                More gifts arriving soon.{" "}
                {/* .tap-44 because this sits inside a sentence — growing the
                    link itself would break the line, and nothing else
                    tappable is near enough to have its tap stolen. */}
                <Link to="/browse" className="tap-44 font-medium text-ink underline underline-offset-4">
                  Browse every category
                </Link>
              </p>
            ) : null}
          </>
        ) : (
          <div className="py-12 text-center">
            <RibbonEmpty className="mx-auto h-14 w-14" />
            <p className="mt-3 font-display text-h2">Nothing here yet</p>
            <p className="mx-auto mt-2 max-w-xs text-body text-muted">
              {budget && totalBeforeBudget > 0
                ? `There are ${totalBeforeBudget} gifts here — just none ${budget.label.toLowerCase()}.`
                : "We're still adding gifts that match."}
            </p>
            {budget ? (
              <button
                onClick={() => go({ budget: null })}
                className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-primary px-7 text-body font-medium text-inverse"
              >
                Show any price
              </button>
            ) : (
              <Link
                to="/browse"
                className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-primary px-7 text-body font-medium text-inverse"
              >
                Browse categories
              </Link>
            )}
          </div>
        )}
      </div>

      {/* The gift card belongs here, at the end — not as the first thing
          offered to someone who said they don't know what to get. */}
      <div className="mt-8 flex items-center justify-between gap-4 rounded-card bg-primary px-5 py-4 text-inverse">
        <p className="text-body">Still stuck? Send a gift card.</p>
        <Link
          to="/gift-cards/send"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-pill bg-canvas px-5 text-caption font-medium text-ink"
        >
          <GiftIcon className="h-4 w-4 text-gold-deep" />
          Send one
        </Link>
      </div>
    </div>
  );
}
