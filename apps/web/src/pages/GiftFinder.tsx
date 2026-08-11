import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { tidyCategory } from "../components/CategoryChips";
import {
  AccountIcon,
  ChevronLeftIcon,
  GiftIcon,
  HeartIcon,
  LightningIcon,
  StarIcon,
  WalletIcon,
} from "../components/Icons";
import { Button, RemovableChip, RibbonEmpty } from "../components/ui";
import {
  FilterBar,
  SortSheet,
  sortProducts,
  type SortValue,
} from "../components/FilterBar";
import {
  CategoryFilterPanel,
  NO_FILTERS,
  countActive,
  filterLabels,
  productMatches,
  removeFilter,
  type CategoryFilters,
  type FilterableProduct,
} from "../components/CategoryFilterPanel";
import {
  BUDGETS,
  QUIZ_RECIPIENTS,
  budgetBySlug,
  inBudgetRange,
  occasionByValue,
  recipientLabel,
  type Budget,
  type Occasion,
} from "../lib/filters";
import { useVariantOptionsForProducts } from "../hooks/useProducts";
import { useGiftResults, type Row } from "../hooks/useGiftFinder";

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
      <div className="mt-5 grid grid-cols-2 gap-2.5">{children}</div>
    </div>
  );
}

/**
 * A quiz option. Two-up, 96px tall, icon over label.
 *
 * It was a 52px text chip in a wrapping flex row, which left two thirds of a
 * 375x812 screen empty under a question — the screen read as unfinished. The
 * resting colours are the chip's exact resting colours (hairline border,
 * surface fill, ink text) so this is the same object, just given the room a
 * primary choice deserves. No photos: by this point the person has said they
 * don't know what to get, so the screen should be a decision, not a mood
 * board.
 */
function QuizOption({
  Icon,
  label,
  filled,
  onClick,
}: {
  Icon: typeof GiftIcon;
  label: string;
  filled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[96px] flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface px-3 text-center text-body font-medium text-ink transition-all duration-press ease-out hover:bg-surface-sunk active:scale-[0.97]"
    >
      <Icon className="h-6 w-6 text-gold-deep" filled={filled} />
      <span className="leading-tight">{label}</span>
    </button>
  );
}

/** One icon per option so the grid reads at a glance. Nothing here claims
 *  anything about the products — it is a label, not data. */
const RECIPIENT_ICONS: Record<string, { Icon: typeof GiftIcon; filled?: boolean }> = {
  mother: { Icon: HeartIcon },
  father: { Icon: StarIcon },
  partner: { Icon: HeartIcon, filled: true },
  friend: { Icon: AccountIcon },
  child: { Icon: LightningIcon },
};

/* No WrapIcon here any more — CADO does not wrap gifts, and a ribbon glyph
   on a budget tile is still the site depicting a service it doesn't offer. */
const BUDGET_ICONS: { Icon: typeof GiftIcon; filled?: boolean }[] = [
  { Icon: WalletIcon },
  { Icon: GiftIcon },
  { Icon: StarIcon },
  { Icon: StarIcon, filled: true },
];

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
        {QUIZ_RECIPIENTS.map((r) => {
          const icon = (r.value && RECIPIENT_ICONS[r.value]) || { Icon: GiftIcon };
          return (
            <QuizOption
              key={r.label}
              Icon={icon.Icon}
              filled={icon.filled}
              label={r.label}
              onClick={() => go({ recipient: r.value, step: "2", skip: r.value ? null : "1" })}
            />
          );
        })}
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
        {BUDGETS.map((b, i) => (
          <QuizOption
            key={b.slug}
            Icon={(BUDGET_ICONS[i] ?? BUDGET_ICONS[0]).Icon}
            filled={(BUDGET_ICONS[i] ?? BUDGET_ICONS[0]).filled}
            label={b.label}
            onClick={() => go({ budget: b.slug, step: null })}
          />
        ))}
      </StepShell>
    );
  }

  // --- Results -------------------------------------------------------------
  // A separate component on purpose: the results screen owns refine-filter and
  // sort state, and hooks cannot live below the two early returns above.
  return (
    <Results
      results={results}
      occasion={occasion}
      recipient={recipient}
      budget={budget}
      onClear={(key) => go({ [key]: null })}
    />
  );
}

function Results({
  results,
  occasion,
  recipient,
  budget,
  onClear,
}: {
  results: ReturnType<typeof useGiftResults>;
  occasion: Occasion | null;
  recipient: string | null;
  budget: Budget | null;
  onClear: (key: string) => void;
}) {
  /**
   * Refine filters, applied in place over the gifts already fetched. No
   * refetch, no navigation, no loading flash — applying the sheet re-renders
   * the grid from the array that is already in memory, which is what makes it
   * feel instant. The URL keeps holding the *entry* filters (occasion /
   * recipient / budget) so a shared link still lands where it did.
   *
   * Same model, same panel and same bar as the category page and search —
   * see components/CategoryFilterPanel.
   */
  const [filters, setFilters] = useState<CategoryFilters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState<SortValue>("suggested");

  const items = useMemo(() => (results.data?.items ?? []) as Row[], [results.data]);
  const totalBeforeBudget = results.data?.totalBeforeBudget ?? 0;
  const relaxed = results.data?.relaxed ?? null;

  // A refinement that survives into a different result set is how a screen
  // ends up mysteriously empty — "Toys" carried over from a budget band that
  // had toys into one that doesn't.
  useEffect(() => {
    setFilters(NO_FILTERS);
    setSort("suggested");
  }, [occasion?.value, recipient, budget?.slug]);

  /**
   * PRICE. Filtered once, through inBudgetRange() — in useGiftResults for the
   * band in the URL, and re-asserted here so this screen's own filter chain
   * contains no raw price comparison either. The upper bound is exclusive and
   * the bands share edges; a `<=` anywhere puts a $50 gift in two bands at
   * once. Do not replace this with a min/max test.
   */
  const inBand = (p: Row) => inBudgetRange(Number(p.price), budget);

  /** Everything the panel counts from: already inside the URL's band, so a
   *  count in the sheet is exactly what applying it will leave on screen. */
  const rows = useMemo(
    () => items.filter(inBand) as unknown as FilterableProduct[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, budget]
  );

  const variants = useVariantOptionsForProducts(useMemo(() => rows.map((p) => p.id), [rows]));

  const visible = useMemo(
    () => sortProducts(rows.filter((p) => productMatches(p, filters, variants.data?.byProduct)), sort),
    [rows, filters, sort, variants.data]
  );

  /** Options come from the gifts in view, never from a hardcoded list, so a
   *  filter that could only ever return nothing is never offered. */
  const categoryOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const p of items) {
      if (p.category?.slug) names.set(p.category.slug, tidyCategory(p.category.name));
    }
    return [...names.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const partnerOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const p of items) {
      const s = (p as { partner?: { id?: string | null; name?: string | null } | null }).partner;
      if (s?.id && s.name) names.set(s.id, s.name);
    }
    return [...names.entries()].map(([id, name]) => ({ id, name }));
  }, [items]);

  const refineChips = useMemo(
    () => filterLabels(filters, { stores: partnerOptions, categories: categoryOptions }),
    [filters, partnerOptions, categoryOptions]
  );

  const refineCount = countActive(filters);
  const clearRefine = () => setFilters(NO_FILTERS);

  // Only claim the occasion in the headline when the results actually honour
  // it. "47 gifts · Get Well" above a grid of untagged gifts reads as a
  // count of Get Well gifts, which is precisely what it isn't.
  const claimsOccasion = !!occasion && relaxed === null;
  const parts = [claimsOccasion ? occasion.label : null, recipientLabel(recipient), budget?.label].filter(
    Boolean
  );
  // Counts what is on screen, so it stays true as refine chips narrow it.
  const count = `${visible.length} ${visible.length === 1 ? "gift" : "gifts"}`;
  const headline = parts.length ? `${count} · ${parts.join(" · ")}` : `${count} to choose from`;

  /** The answers that came in on the URL. Clearing one of these re-runs the
   *  query, unlike the refine chips, which are applied in memory. */
  const entryChips = (
    [
      occasion ? { key: "occasion", label: occasion.label } : null,
      recipient ? { key: "recipient", label: recipientLabel(recipient) ?? recipient } : null,
      budget ? { key: "budget", label: budget.label } : null,
    ] as ({ key: string; label: string } | null)[]
  ).filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="py-6">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="font-display text-h1">{results.isLoading ? "Finding gifts…" : headline}</h1>

        {/* Say plainly when the answer isn't literally what was asked for.
            Quietly showing something else is how a filter loses its meaning.
            One quiet line — it is a footnote to the headline, not a banner. */}
        {relaxed === "occasion-untagged" && occasion ? (
          <p className="mt-1.5 text-caption text-muted">
            Nothing tagged {occasion.label.toLowerCase()} yet — showing what else suits.
          </p>
        ) : relaxed === "occasion-thin" && occasion ? (
          <p className="mt-1.5 text-caption text-muted">
            Few {occasion.label.toLowerCase()} gifts so far — showing what else fits.
          </p>
        ) : null}
      </div>

      <div className="mx-auto max-w-6xl px-4">
      {/*
        THE BAR. Two buttons, both opening a sheet — the same control the
        category page and search use. It replaces the swipeable refine rail
        plus the separate sort pill that used to sit here.

        It is rendered at a FIXED HEIGHT in both states, which is a CLS fix as
        much as a layout one: the old wrapping chip block was however many
        rows tall the data made it, so it could not be reserved before the
        query landed and it shoved the grid down when it arrived (measured:
        CLS 0 -> 0.18 on /gift-finder?budget=20-50). The bar is always exactly
        one 44px row, and the skeleton below reserves the identical box.
      */}
      {results.isLoading ? (
        <div className="mt-4 flex items-center gap-2" aria-hidden>
          <span className="skeleton h-11 flex-1 rounded-pill" />
          <span className="h-6 w-px shrink-0 bg-line" />
          <span className="skeleton h-11 flex-1 rounded-pill" />
        </div>
      ) : (
        <div className="mt-4">
          <FilterBar
            activeCount={refineCount}
            sort={sort}
            onOpenFilter={() => setFilterOpen(true)}
            onOpenSort={() => setSortOpen(true)}
          />
        </div>
      )}

      {/* One chip row for both kinds of narrowing. The entry filters came
          from the URL and clearing one re-runs the query; the refine filters
          are in-memory. They look identical because to the person reading
          them they mean the same thing — "this is what is narrowing it". */}
      {!results.isLoading && (entryChips.length > 0 || refineChips.length > 0) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {entryChips.map((c) => (
            <RemovableChip key={`entry-${c.key}`} onRemove={() => onClear(c.key)}>
              {c.label}
            </RemovableChip>
          ))}
          {refineChips.map((c) => (
            <RemovableChip
              key={c.id}
              onRemove={() => setFilters((f) => removeFilter(f, c.key, c.value))}
            >
              {c.label}
            </RemovableChip>
          ))}
          {entryChips.length + refineChips.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                clearRefine();
                entryChips.forEach((c) => onClear(c.key));
              }}
              className="tap-44 inline-flex h-[32px] items-center rounded-pill px-2 text-caption font-medium text-muted underline underline-offset-4 hover:text-ink"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        {results.isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : visible.length > 0 ? (
          <>
            <div className="grid animate-fade-in grid-cols-2 gap-3 md:grid-cols-4">
              {visible.map((p) => (
                <ProductCard key={p.id} {...(p as unknown as Parameters<typeof ProductCard>[0])} />
              ))}
            </div>
            {/* Thin, but real. Never padded out with duplicates. */}
            {visible.length < 4 && refineCount === 0 ? (
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
            {/* Two different dead ends, two different ways out. Refining to
                zero is the user's own doing and is one tap to undo, so it must
                never be dressed up as "we have nothing" — and it must never be
                a blank screen. */}
            <p className="mt-3 font-display text-h2">
              {refineCount > 0 ? "No gifts match these filters" : "Nothing here yet"}
            </p>
            <p className="mx-auto mt-2 max-w-xs text-body text-muted">
              {refineCount > 0
                ? `There ${items.length === 1 ? "is" : "are"} ${items.length} ${
                    items.length === 1 ? "gift" : "gifts"
                  } here — just none matching all of them.`
                : budget && totalBeforeBudget > 0
                  ? `There are ${totalBeforeBudget} gifts here — just none ${budget.label.toLowerCase()}.`
                  : "We're still adding gifts that match."}
            </p>
            {refineCount > 0 ? (
              <Button className="mt-5" onClick={clearRefine}>
                Clear filters
              </Button>
            ) : budget ? (
              <button
                onClick={() => onClear("budget")}
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

      {/* Results span every category, so — unlike /category/:slug — this
          panel does offer the Category group. Price is offered only when the
          gifts in view actually straddle more than one band, so entering
          from a budget chip does not get a group restating that budget. */}
      <CategoryFilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        rows={rows}
        stores={partnerOptions}
        categories={categoryOptions}
        variants={variants.data}
        filters={filters}
        onApply={setFilters}
      />

      <SortSheet open={sortOpen} onClose={() => setSortOpen(false)} sort={sort} onChange={setSort} />
    </div>
  );
}
