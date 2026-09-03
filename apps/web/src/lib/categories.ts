/**
 * THE ONE PLACE THE CATEGORY ORDER IS DECIDED.
 *
 * Reorder the tabs by editing this array and nothing else. Before this file
 * the order lived in three different database columns, each read by different
 * screens and each free to drift from the others:
 *
 *   browse_tabs.position   the tab bar and the swipe order
 *   categories.sort_order  every chip row, grid and dropdown built from
 *                          useCategories — Browse, Wishlist, the gift
 *                          assistant, the category pages
 *   browse_tiles.position  the "Shop by category" circles on the All tab and
 *                          the grid inside the all-categories sheet
 *
 * Three sources meant a reorder was three edits plus a migration, and the
 * first time one of them was missed nobody would notice until a screenshot.
 * The rows are still updated to match (see the migration), so the dashboard
 * and anything reading the database directly stay in step — but THIS ARRAY
 * WINS AT RUNTIME. If a row disagrees, the app follows the array.
 *
 * Slugs, not names. A category can be renamed — "Jewelry & Accessories"
 * became "Jewels & Accs" — and renaming must never silently reorder the shop.
 */
export const CATEGORY_ORDER = [
  "fashion",
  "flowers-gifts",
  "chocolate",
  "perfumes",
  "jewelry-accessories",
  "gift-sets",
  "toys",
  "shoes",
  "electronics",
  "sport",
  "home-appliances",
] as const;

export type CategorySlug = (typeof CATEGORY_ORDER)[number];

/**
 * Where a slug sits in the running order.
 *
 * `null`/undefined is the All tab — it carries no category filter and always
 * leads. A slug missing from the array sorts to the END rather than to the
 * front, so a category added to the database but not yet placed here appears
 * last instead of silently jumping to first place.
 */
export function categoryRank(slug: string | null | undefined): number {
  if (!slug) return -1;
  const i = (CATEGORY_ORDER as readonly string[]).indexOf(slug);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

/** Sort any list of things that know their category slug. Stable, non-mutating. */
export function byCategoryOrder<T>(rows: readonly T[], slugOf: (row: T) => string | null | undefined): T[] {
  return rows.slice().sort((a, b) => categoryRank(slugOf(a)) - categoryRank(slugOf(b)));
}
