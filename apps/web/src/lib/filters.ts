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
  { slug: "under-50", label: "Under $50", min: 0, max: 50 },
  { slug: "50-100", label: "$50 – $100", min: 50, max: 100 },
  { slug: "100-200", label: "$100 – $200", min: 100, max: 200 },
  { slug: "200-plus", label: "$200+", min: 200, max: null },
];

/**
 * Every band slug this app has ever shipped, pointed at its nearest current
 * band. Shared links and bookmarks have to land somewhere sensible.
 *
 * "100-plus" was open-ended and now splits in two; it maps to $100–$200,
 * which is where all but one product in that range actually sits. The two
 * cheap bands both fold into Under $50 — that is the change Marwan asked for
 * (2026-08), on the grounds that the bottom of the catalogue is thin.
 */
const LEGACY_BUDGET_SLUGS: Record<string, string> = {
  "under-20": "under-50",
  "20-50": "under-50",
  "100-plus": "100-200",
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
  /** Photo for the homepage card. Every entry has one — these render as
   *  image cards, so an entry without a photo would be a grey hole. */
  img: string;
  /**
   * False when no product in the catalogue carries this tag yet. The card
   * still exists — it is navigation people look for — but the results screen
   * uses this to say plainly that there is nothing tagged for it yet instead
   * of quietly showing unrelated gifts as if they matched.
   *
   * Re-checked against the live catalogue on 2026-08-15, after
   * `scripts/tag-catalogue.mjs` tagged it properly. Every occasion CADO
   * offers now carries real stock: birthday 126, visiting-someone 50,
   * housewarming 29, anniversary 31, get-well 27, graduation 20,
   * valentine 17, newborn 8, mothers-day 5, engagement 3, eid 2, wedding 2.
   *
   * Before that pass, 112 of 159 products had no occasion tag at all and
   * three occasions — Visiting Someone, Get Well Soon, Engagement — were
   * carried by nothing, which is why every chip returned the same count and
   * then apologised for having nothing tagged. The field stays because it is
   * the honest mechanism for the next occasion added ahead of its stock, not
   * because anything is currently empty.
   */
  tagged: boolean;
};

/**
 * ORDER IS DELIBERATE AND IS NOT ALPHABETICAL OR BY VOLUME.
 *
 * Visiting Someone leads because in Lebanon turning up at someone's house
 * with something in your hand is the most common gifting occasion there is —
 * it outnumbers birthdays in real life even though it carries no tag in the
 * catalogue yet. Anniversary, Get Well Soon, Birthday, Graduation follow;
 * the rest trail.
 */
export const OCCASIONS: Occasion[] = [
  { value: "visiting-someone", label: "Visiting Someone", img: "/occasions/visiting-someone.jpg", tagged: true },
  { value: "anniversary", label: "Anniversary", img: "/occasions/anniversary.jpg", tagged: true },
  { value: "get-well", label: "Get Well Soon", img: "/occasions/get-well-soon.jpg", tagged: true },
  { value: "birthday", label: "Birthday", img: "/occasions/birthday-banner.jpg", tagged: true },
  { value: "graduation", label: "Graduation", img: "/occasions/graduation.jpg", tagged: true },
  { value: "newborn", label: "New Baby", img: "/occasions/new-baby.jpg", tagged: true },
  { value: "wedding", label: "Wedding", img: "/occasions/wedding.jpg", tagged: true },
  { value: "engagement", label: "Engagement", img: "/occasions/engagement.jpg", tagged: true },
];

export function occasionByValue(value: string | null | undefined): Occasion | null {
  if (!value) return null;
  return OCCASIONS.find((o) => o.value === value) ?? null;
}

/**
 * The "For" group inside the filter panel.
 *
 * These are not new fields — each maps onto a recipient_tag that already
 * exists on real products (live counts on 2026-08-11: her 20, him 12,
 * child 12 of 47 active gifts), which is why the group can be offered at
 * all. The panel additionally hides any option whose live count is 0, so a
 * category with no womenswear never shows a "Her" chip that leads nowhere.
 *
 * Her / Him / Kids, in that order, because that is the order it was asked
 * for. Labels are the bare noun — the group heading already says "For".
 */
export const AUDIENCES: { value: string; label: string }[] = [
  { value: "her", label: "Her" },
  { value: "him", label: "Him" },
  { value: "child", label: "Kids" },
];
