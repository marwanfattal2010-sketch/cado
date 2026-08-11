/**
 * Single source of truth for the budget bands, recipients and occasions
 * used by the homepage shortcuts, the category filter sheet and the gift
 * finder. Everything reads from here so labels, price bands and URL slugs
 * can never drift apart between screens.
 */

export type Budget = {
  slug: string;
  label: string;
  min: number;
  max: number | null;
};

/**
 * Four bands, everywhere. The homepage chips, the filter sheet and the quiz
 * all render this exact array — if a fifth band ever appears here it appears
 * in all three at once, which is the point.
 */
export const BUDGETS: Budget[] = [
  { slug: "under-20", label: "Under $20", min: 0, max: 20 },
  { slug: "20-50", label: "$20 – $50", min: 20, max: 50 },
  { slug: "50-100", label: "$50 – $100", min: 50, max: 100 },
  { slug: "100-plus", label: "$100+", min: 100, max: null },
];

/** The old five-band scheme split $100+ in two. Links that were already
 *  shared (or bookmarked) still have to land somewhere sensible. */
const LEGACY_BUDGET_SLUGS: Record<string, string> = {
  "100-200": "100-plus",
  "200-plus": "100-plus",
};

export function budgetBySlug(slug: string | null | undefined): Budget | null {
  if (!slug) return null;
  const resolved = LEGACY_BUDGET_SLUGS[slug] ?? slug;
  return BUDGETS.find((b) => b.slug === resolved) ?? null;
}

/**
 * The upper bound is EXCLUSIVE. The bands share their edges — 50 is both the
 * top of "$20 – $50" and the bottom of "$50 – $100" — so an inclusive test
 * put every boundary-priced item in two bands at once. That was visible as
 * filter counts summing to more than the number of products.
 *
 * Every price filter must go through here so the bands can't drift apart
 * again between the homepage, the category page and the gift finder.
 */
export function inBudgetRange(price: number, budget: Budget | null | undefined): boolean {
  if (!budget) return true;
  if (price < budget.min) return false;
  return budget.max == null || price < budget.max;
}

export type Recipient = {
  /** Must match a value in products.recipient_tags. */
  value: string;
  label: string;
  img: string;
};

/**
 * The photo row on the homepage. Every entry maps to a recipient_tag that
 * actually exists on products — a card that leads to a guaranteed-empty
 * result is worse than no card.
 */
export const RECIPIENTS: Recipient[] = [
  { value: "her", label: "For Her", img: "/recipients/for-her.jpg" },
  { value: "him", label: "For Him", img: "/recipients/for-him.jpg" },
  { value: "mother", label: "For Mom", img: "/recipients/for-mom.jpg" },
  { value: "father", label: "For Dad", img: "/recipients/for-dad.jpg" },
  { value: "partner", label: "For Your Partner", img: "/recipients/for-couples.jpg" },
  { value: "friend", label: "For a Friend", img: "/recipients/for-best-friend.jpg" },
  { value: "child", label: "For Kids", img: "/recipients/for-kids.jpg" },
];

export function recipientByValue(value: string | null | undefined): Recipient | null {
  if (!value) return null;
  return RECIPIENTS.find((r) => r.value === value) ?? null;
}

/**
 * Step 1 of the quiz. Six plain chips, no photos: at this point the person
 * has already said they don't know what to get, so the screen should be a
 * decision, not a mood board.
 *
 * `null` is "Someone else" — a real answer that applies no recipient filter
 * rather than a dead end.
 */
export const QUIZ_RECIPIENTS: { value: string | null; label: string }[] = [
  { value: "mother", label: "Mom" },
  { value: "father", label: "Dad" },
  { value: "partner", label: "Partner" },
  { value: "friend", label: "Friend" },
  { value: "child", label: "Kids" },
  { value: null, label: "Someone else" },
];

/** Label for a recipient slug, including the quiz-only ones. */
export function recipientLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return (
    RECIPIENTS.find((r) => r.value === value)?.label ??
    QUIZ_RECIPIENTS.find((r) => r.value === value)?.label ??
    null
  );
}

export type Occasion = {
  /** Matches products.occasion_tags where one exists. */
  value: string;
  label: string;
  /**
   * False when no product in the catalogue carries this tag yet. The chip
   * still exists — it is navigation people look for — but the results screen
   * uses this to say plainly that there is nothing tagged for it yet instead
   * of quietly showing unrelated gifts as if they matched.
   *
   * "just-because" is deliberately false too: it means "no occasion", so it
   * should show everything rather than filter to a tag.
   */
  tagged: boolean;
};

/** Birthday first — it is the flagship occasion by a wide margin. */
export const OCCASIONS: Occasion[] = [
  { value: "birthday", label: "Birthday", tagged: true },
  { value: "anniversary", label: "Anniversary", tagged: true },
  { value: "get-well", label: "Get Well", tagged: false },
  { value: "graduation", label: "Graduation", tagged: true },
  { value: "newborn", label: "New Baby", tagged: true },
  { value: "just-because", label: "Just Because", tagged: false },
];

export function occasionByValue(value: string | null | undefined): Occasion | null {
  if (!value) return null;
  return OCCASIONS.find((o) => o.value === value) ?? null;
}

/** The three "For" audiences offered inside the category filter sheet.
 *  Fashion and Shoes lean on this hardest, but it applies everywhere. */
export const AUDIENCES: { value: string; label: string }[] = [
  { value: "her", label: "For Her" },
  { value: "him", label: "For Him" },
  { value: "child", label: "For Kids" },
];
