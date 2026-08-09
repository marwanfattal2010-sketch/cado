/**
 * Single source of truth for the budget bands and recipient options used by
 * the homepage shortcuts and the gift finder. Both read from here so the
 * labels, price bands, and URL slugs can never drift apart.
 */

export type Budget = {
  slug: string;
  label: string;
  min: number;
  max: number | null;
};

export const BUDGETS: Budget[] = [
  { slug: "under-20", label: "Under $20", min: 0, max: 20 },
  { slug: "20-50", label: "$20 – $50", min: 20, max: 50 },
  { slug: "50-100", label: "$50 – $100", min: 50, max: 100 },
  { slug: "100-200", label: "$100 – $200", min: 100, max: 200 },
  { slug: "200-plus", label: "$200+", min: 200, max: null },
];

export function budgetBySlug(slug: string | null): Budget | null {
  if (!slug) return null;
  return BUDGETS.find((b) => b.slug === slug) ?? null;
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
 * Every entry maps to a recipient_tag that actually exists on products —
 * a card that leads to a guaranteed-empty result is worse than no card.
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

export function recipientByValue(value: string | null): Recipient | null {
  if (!value) return null;
  return RECIPIENTS.find((r) => r.value === value) ?? null;
}

export type Occasion = {
  /** Matches products.occasion_tags where one exists; "just-because" and
   *  "sorry" have no tag yet and fall through to recipient+budget only. */
  value: string;
  label: string;
};

export const OCCASIONS: Occasion[] = [
  { value: "birthday", label: "Birthday" },
  { value: "graduation", label: "Congratulations" },
  { value: "housewarming", label: "Visiting them" },
  { value: "anniversary", label: "Anniversary" },
  { value: "newborn", label: "New baby" },
  { value: "just-because", label: "Just because" },
];

export function occasionByValue(value: string | null): Occasion | null {
  if (!value) return null;
  return OCCASIONS.find((o) => o.value === value) ?? null;
}
