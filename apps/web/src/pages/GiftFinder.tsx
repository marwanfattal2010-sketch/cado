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
  WrapIcon,
} from "../components/Icons";
import { Button, Chip, RemovableChip, RibbonEmpty } from "../components/ui";
import {
  AUDIENCES,
  BUDGETS,
  QUIZ_RECIPIENTS,
  budgetBySlug,
  inBudgetRange,
  occasionByValue,
  recipientLabel,
  type Budget,
  type Occasion,
} from "../lib/filters";
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

const BUDGET_ICONS: { Icon: typeof GiftIcon }[] = [
  { Icon: WalletIcon },
  { Icon: GiftIcon },
  { Icon: WrapIcon },
  { Icon: StarIcon },
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

/** Sort is an ordering, never a filter — nothing here removes a product.
 *  "Suggested" is the finder's own order (curated lists first, then newest);
 *  it makes no popularity claim, because there is no sales data to make one
 *  from. */
type Sort = "suggested" | "price_asc" | "price_desc";

const SORTS: { value: Sort; label: string }[] = [
  { value: "suggested", label: "Suggested" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

/**
 * The audience refine-chips, in the order they were asked for. These are the
 * same three recipient_tags the category filter panel offers (AUDIENCES in
 * lib/filters.ts — the only three that exist on real products), labelled the
 * way the homepage labels them: "For Her", not "Woman".
 */
const AUDIENCE_OPTIONS = (["her", "him", "child"] as const)
  .filter((v) => AUDIENCES.some((a) => a.value === v))
  .map((value) => ({ value: value as string, label: recipientLabel(value) ?? value }));

const has = (list: string[], v: string) => list.includes(v);
const toggle = (list: string[], v: string) =>
  has(list, v) ? list.filter((x) => x !== v) : [...list, v];

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
   * refetch, no navigation, no loading flash — tapping a chip re-renders the
   * grid from the array that is already in memory, which is what makes it
   * feel instant. The URL keeps holding the *entry* filters (occasion /
   * recipient / budget) so a shared link still lands where it did.
   */
  const [audiences, setAudiences] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>("suggested");

  const items = useMemo(() => (results.data?.items ?? []) as Row[], [results.data]);
  const totalBeforeBudget = results.data?.totalBeforeBudget ?? 0;
  const relaxed = results.data?.relaxed ?? null;

  // A refinement that survives into a different result set is how a screen
  // ends up mysteriously empty — "Toys" carried over from a budget band that
  // had toys into one that doesn't.
  useEffect(() => {
    setAudiences([]);
    setCategories([]);
    setSort("suggested");
  }, [occasion?.value, recipient, budget?.slug]);

  const matchesAudience = (p: Row, sel: string[]) =>
    sel.length === 0 || (p.recipient_tags ?? []).some((t) => sel.includes(t));
  const matchesCategory = (p: Row, sel: string[]) =>
    sel.length === 0 || (p.category?.slug != null && sel.includes(p.category.slug));

  /**
   * PRICE. Filtered once, through inBudgetRange() — in useGiftResults for the
   * band in the URL, and re-asserted here so this screen's own filter chain
   * contains no raw price comparison either. The upper bound is exclusive and
   * the bands share edges; a `<=` anywhere puts a $50 gift in two bands at
   * once. Do not replace this with a min/max test.
   */
  const inBand = (p: Row) => inBudgetRange(Number(p.price), budget);

  const visible = useMemo(() => {
    const list = items.filter(
      (p) => inBand(p) && matchesAudience(p, audiences) && matchesCategory(p, categories)
    );
    if (sort === "price_asc") list.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price_desc") list.sort((a, b) => Number(b.price) - Number(a.price));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, audiences, categories, sort, budget]);

  /**
   * Options come from the gifts in view, never from a hardcoded list, so a
   * chip that could only ever return nothing is never offered. Each count is
   * computed with the OTHER group's selection applied — the same rule
   * Category and Search use — so a count always says how many results that
   * one tap would actually leave you with.
   *
   * An option that has fallen to zero while selected stays on screen; hiding
   * it would strand the filter with no way to switch it off.
   */
  const audienceOptions = useMemo(
    () =>
      AUDIENCE_OPTIONS.map((o) => ({
        ...o,
        count: items.filter(
          (p) => inBand(p) && matchesCategory(p, categories) && (p.recipient_tags ?? []).includes(o.value)
        ).length,
      })).filter((o) => o.count > 0 || has(audiences, o.value)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, categories, audiences, budget]
  );

  const categoryOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const p of items) {
      if (p.category?.slug) names.set(p.category.slug, tidyCategory(p.category.name));
    }
    return [...names.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: items.filter(
          (p) => inBand(p) && matchesAudience(p, audiences) && p.category?.slug === value
        ).length,
      }))
      .filter((o) => o.count > 0 || has(categories, o.value))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, audiences, categories, budget]);

  const refineCount = audiences.length + categories.length;
  const clearRefine = () => {
    setAudiences([]);
    setCategories([]);
  };

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

  const activeChips = (
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

        {activeChips.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeChips.map((c) => (
              <RemovableChip key={c.key} onRemove={() => onClear(c.key)}>
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
      </div>

      {/*
        REFINE. Chips narrow the grid in place — no reload, no refetch, no
        Apply button. Multiple chips in one group are an OR ("For Her or For
        Kids"); the two groups are ANDed together, which is the combination
        people actually mean. Every option here was derived from the gifts on
        screen, so none of them can lead to a guaranteed-empty grid.

        ONE SWIPEABLE LINE, NOT A WRAPPING BLOCK, AND IT IS A CLS FIX AS MUCH
        AS A LAYOUT ONE. A wrapping row is however many rows tall the data
        makes it, so it cannot be reserved before the query lands — it
        appeared above the grid on load and shoved it down (measured: CLS 0 ->
        0.18 on /gift-finder?budget=20-50). A single .scroll-row is always
        exactly one chip tall, so the skeleton below reserves the identical
        box and nothing moves when the real chips arrive.

        Full-bleed rather than inside the px-4 container: .scroll-row carries
        its own page gutter, so nesting it in padding would double to 32px and
        put this row out of line with the title above it.
      */}
      <div className="pt-4">
        {results.isLoading ? (
          <div className="scroll-row" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="skeleton h-11 w-[96px] rounded-pill" />
            ))}
          </div>
        ) : audienceOptions.length > 0 || categoryOptions.length > 1 ? (
          <div className="scroll-row">
            {audienceOptions.map((o) => (
              <Chip
                key={`a-${o.value}`}
                active={has(audiences, o.value)}
                onClick={() => setAudiences((s) => toggle(s, o.value))}
                className="!text-caption"
              >
                {o.label}
                <span className={has(audiences, o.value) ? "opacity-70" : "text-muted"}>{o.count}</span>
              </Chip>
            ))}
            {categoryOptions.map((o) => (
              <Chip
                key={`c-${o.value}`}
                active={has(categories, o.value)}
                onClick={() => setCategories((s) => toggle(s, o.value))}
                className="!text-caption"
              >
                {o.label}
                <span className={has(categories, o.value) ? "opacity-70" : "text-muted"}>{o.count}</span>
              </Chip>
            ))}
            {refineCount > 0 ? (
              <button
                onClick={clearRefine}
                className="inline-flex h-11 items-center whitespace-nowrap px-2 text-caption font-medium text-muted underline underline-offset-4 hover:text-ink"
              >
                Clear
              </button>
            ) : null}
          </div>
        ) : (
          /* No refinements worth offering — hold the same 44px so the grid
             does not jump between this state and the skeleton above. */
          <div className="h-11" />
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4">
      {/* SORT. Two directions and the finder's own order — the whole control,
          because a sort menu with eight entries is a menu nobody reads.
          Gated on the UNFILTERED count so the control does not appear and
          disappear (moving the grid) as chips are tapped. */}
      {results.isLoading ? (
        <span className="skeleton mt-3 block h-11 w-full max-w-[240px] rounded-pill" />
      ) : items.length > 1 ? (
        <label className="relative mt-3 flex h-11 w-full max-w-[240px] items-center rounded-pill border border-line bg-surface">
          <span className="sr-only">Sort gifts</span>
          {/* The select fills the pill rather than sitting as a line of text
              inside it, so the tap target is the control and not the label. */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-full w-full appearance-none rounded-pill bg-transparent pl-4 pr-9 text-caption font-medium text-ink outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </select>
          <span aria-hidden className="pointer-events-none absolute right-4 text-[10px] text-muted">
            ▾
          </span>
        </label>
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
    </div>
  );
}
