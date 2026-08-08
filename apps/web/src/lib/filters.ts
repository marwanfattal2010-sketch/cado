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
