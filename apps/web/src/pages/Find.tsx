import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStockedCategories } from "../hooks/useCategories";
import { tidyCategory } from "../components/CategoryChips";
import { ChevronLeftIcon } from "../components/Icons";
import { Img } from "../components/Img";
import { BUDGETS, OCCASIONS } from "../lib/filters";

/**
 * /find — the gift finder.
 *
 * One quiz in the app. Both the hero's SHOP NOW and the "Help me choose" link
 * beside the search bar land here, and it finishes by handing its answers to
 * /gift-finder, which is the results grid that already knows how to show them
 * as removable chips and how to relax a filter that returns nothing.
 *
 * Three screens, and every one of them is skippable. Skipping simply leaves
 * that filter off — there is no "no preference" answer to store, because an
 * absent parameter already means exactly that. Skipping all three lands on
 * the unfiltered grid rather than an error, which is the point of a shortcut
 * you can bail out of.
 *
 * No typing anywhere, and no scoring: the answers are the filters, one to
 * one. Nothing here infers a taste profile it could get wrong.
 */

const STEPS = 3;

/** The six the spec asked for, in the order it asked for them. Drawn from the
 *  shared OCCASIONS list rather than retyped, so a label or a photo changed
 *  in lib/filters shows up here too. */
const QUIZ_OCCASIONS = ["visiting-someone", "birthday", "anniversary", "get-well", "newborn", "graduation"]
  .map((v) => OCCASIONS.find((o) => o.value === v))
  .filter((o): o is (typeof OCCASIONS)[number] => !!o);

function Dots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: STEPS }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-base ${
            i === step ? "w-5 bg-ink" : "w-1.5 bg-ink/20"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Persimmon, and only for the selected state — everything else on the screen
 * stays cream and near-black.
 *
 * Written out in full rather than composed from a variable: Tailwind builds
 * its stylesheet by scanning the source for whole class names, so a class
 * assembled at runtime (`hover:${SELECTED}`) produces no rule at all and the
 * state silently does nothing.
 */
const CARD_BASE =
  "border transition-all duration-press ease-out active:scale-[0.98] shadow-rest";
const CARD_OFF = "border-line bg-surface";
const CARD_ON = "border-[#F94E33] bg-[#F94E33]/[0.06]";

function Shell({
  step,
  title,
  onBack,
  onSkip,
  children,
}: {
  step: number;
  title: string;
  onBack: () => void;
  onSkip: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 pb-16 pt-3">
      <div className="flex h-11 items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-ink"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <Dots step={step} />
        </div>
        {/* Skip is on every screen and always in the same place. A shortcut
            you cannot leave is not a shortcut. */}
        <button
          type="button"
          onClick={onSkip}
          className="flex h-11 shrink-0 items-center px-2 text-caption font-medium text-muted underline underline-offset-4"
        >
          Skip
        </button>
      </div>

      <h1 className="mt-5 font-display text-h1">{title}</h1>
      <p className="mt-1 text-caption text-muted">
        Question {step + 1} of {STEPS} · skip anything you don't mind about
      </p>

      <div className="mt-5">{children}</div>
    </div>
  );
}

/** A plain text card — used for budget, which has nothing to photograph. */
function TextCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex min-h-[64px] w-full items-center rounded-card px-5 text-left text-body font-medium text-ink ${CARD_BASE} ${
        selected ? CARD_ON : CARD_OFF
      }`}
    >
      {label}
    </button>
  );
}

/**
 * A photo card — used for occasion and category, both of which already have
 * real images in the project.
 *
 * The selected ring earns its place on the way back: tapping a card advances
 * immediately, so the only time you see this state is when you press Back to
 * change an answer, and it needs to be obvious which one you picked.
 */
function ImageCard({
  label,
  img,
  selected,
  onClick,
}: {
  label: string;
  img: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex aspect-[4/3] w-full items-end overflow-hidden rounded-card bg-surface-sunk p-3 text-left ${CARD_BASE} ${
        selected ? "border-2 border-[#F94E33]" : "border-line"
      }`}
    >
      <Img src={img} className="absolute inset-0 h-full w-full object-cover" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <span className="relative font-display text-[15px] font-semibold leading-tight text-inverse drop-shadow">
        {label}
      </span>
    </button>
  );
}

export function Find() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string | null>(null);
  const categories = useStockedCategories();

  /** Only categories that actually have gifts in them — the same list the
   *  home page's circles are built from. An option that leads to an empty
   *  grid is worse than one fewer option. */
  const categoryOptions = useMemo(
    () =>
      (categories.data ?? []).map((c) => ({
        value: c.slug,
        label: tidyCategory(c.name),
        img: `/categories/${c.slug}.jpg`,
      })),
    [categories.data]
  );

  /**
   * Hand the answers to the results grid. Anything skipped is simply absent
   * from the URL, and an entirely empty answer set carries `skip=1` so
   * /gift-finder knows to show the unfiltered grid rather than its own first
   * question.
   */
  const finish = (last: { category?: string | null } = {}) => {
    const params = new URLSearchParams();
    if (budget) params.set("budget", budget);
    if (occasion) params.set("occasion", occasion);
    if (last.category) params.set("category", last.category);
    if (!params.toString()) params.set("skip", "1");
    navigate(`/gift-finder?${params.toString()}`, { replace: true });
  };

  const back = () => (step === 0 ? navigate(-1) : setStep((s) => s - 1));

  if (step === 0) {
    return (
      <Shell step={0} title="What's your budget?" onBack={back} onSkip={() => setStep(1)}>
        <div className="flex flex-col gap-2.5">
          {BUDGETS.map((b) => (
            <TextCard
              key={b.slug}
              label={b.label}
              selected={budget === b.slug}
              onClick={() => {
                setBudget(b.slug);
                setStep(1);
              }}
            />
          ))}
        </div>
      </Shell>
    );
  }

  if (step === 1) {
    return (
      <Shell step={1} title="What's the occasion?" onBack={back} onSkip={() => setStep(2)}>
        <div className="grid grid-cols-2 gap-2.5">
          {QUIZ_OCCASIONS.map((o) => (
            <ImageCard
              key={o.value}
              label={o.label}
              img={o.img}
              selected={occasion === o.value}
              onClick={() => {
                setOccasion(o.value);
                setStep(2);
              }}
            />
          ))}
        </div>
      </Shell>
    );
  }

  return (
    <Shell step={2} title="What kind of gift?" onBack={back} onSkip={() => finish()}>
      <div className="grid grid-cols-2 gap-2.5">
        {categoryOptions.map((c) => (
          <ImageCard
            key={c.value}
            label={c.label}
            img={c.img}
            selected={false}
            onClick={() => finish({ category: c.value })}
          />
        ))}
      </div>
    </Shell>
  );
}
