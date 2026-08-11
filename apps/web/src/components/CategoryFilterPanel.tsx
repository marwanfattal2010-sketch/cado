import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Sheet } from "./ui";
import { AUDIENCES, BUDGETS, budgetBySlug, inBudgetRange } from "../lib/filters";
import type { VariantOptions } from "../hooks/useProducts";

/**
 * One filter model, one matcher, one panel — shared by the category page, the
 * in-place category view on the homepage, search results and the gift finder
 * results. They used to be able to drift; now a group added here appears in
 * all of them or in none.
 *
 * EVERY GROUP HERE IS BACKED BY A COLUMN THAT ACTUALLY HAS VALUES IN IT.
 * Verified against the live database on 2026-08-11:
 *   For    -> products.recipient_tags   her 20, him 12, child 12 of 47 active
 *   Colour -> products.color            32 of 47 active carry a value
 *   Size   -> product_variants.name     ZERO rows exist yet, so the group
 *                                       does not render at all
 * Nothing in this file hardcodes an option list. Options are derived from
 * the rows actually in view, and an option whose count is 0 is not shown, so
 * a filter can never lead to a guaranteed-empty screen.
 *
 * MULTI-SELECT. Every group is an array. Within a group the values are ORed
 * ("Her or Kids"), and the groups are ANDed together — which is the
 * combination people actually mean when they tick two boxes.
 */
export type CategoryFilters = {
  /** recipient_tags: her / him / child. Surfaced as "For". */
  audience: string[];
  /** product_variants.name. Empty in production today — see useProducts. */
  size: string[];
  /** products.color, matched on the exact stored string. */
  color: string[];
  /** Budget band slugs. Always resolved through inBudgetRange(). */
  budget: string[];
  storeId: string[];
  /** Top-level category slug. Only offered outside a category page. */
  category: string[];
  subcategory: string[];
  sameDayOnly: boolean;
};

export const NO_FILTERS: CategoryFilters = {
  audience: [],
  size: [],
  color: [],
  budget: [],
  storeId: [],
  category: [],
  subcategory: [],
  sameDayOnly: false,
};

/** The array-valued keys, in the order their chips should read. */
const LIST_KEYS = [
  "audience",
  "category",
  "subcategory",
  "color",
  "budget",
  "size",
  "storeId",
] as const;
type ListKey = (typeof LIST_KEYS)[number];

/** The minimum a product row has to look like to be filterable. */
export type FilterableProduct = {
  id: string;
  price: number | string;
  recipient_tags?: string[] | null;
  color?: string | null;
  same_day?: boolean | null;
  stock_quantity?: number | null;
  partner?: { id?: string | null } | null;
  category?: { slug?: string | null } | null;
  subcategory?: { slug?: string | null } | null;
};

/**
 * How a colour NAME is drawn as a dot. This is not an option list — the
 * options come from products.color — it only decides what swatch to paint
 * next to a name the database already gave us. A colour with no entry here
 * still renders, with a neutral dot, so new values from the dashboard are
 * never dropped.
 *
 * Literal hex is correct here and is the one sanctioned exception to the
 * "no raw hex" rule: these are samples of a real-world colour, so they
 * cannot come from the brand palette.
 */
const SWATCH: Record<string, string> = {
  black: "#17130f",
  white: "#ffffff",
  grey: "#9b9691",
  gray: "#9b9691",
  silver: "#c8ccce",
  gold: "#c9a227",
  beige: "#e3d5bf",
  brown: "#7a5334",
  red: "#b23a34",
  pink: "#e8a9b6",
  blue: "#4a7ab0",
  navy: "#26364f",
  green: "#4f7d5a",
  purple: "#7b5f97",
  orange: "#d38037",
  yellow: "#e2c14e",
  cream: "#f2e8d8",
};

const MULTI = "conic-gradient(#b23a34,#e2c14e,#4f7d5a,#4a7ab0,#7b5f97,#b23a34)";

function swatchStyle(name: string): { background: string } | null {
  const key = name.trim().toLowerCase();
  if (key === "multicolour" || key === "multicolor") return { background: MULTI };
  const hex = SWATCH[key];
  return hex ? { background: hex } : null;
}

/** The single matcher. Every grid and every count in the panel runs this,
 *  so a number in the panel is exactly what tapping it will give you. */
export function productMatches(
  p: FilterableProduct,
  f: CategoryFilters,
  sizesByProduct?: Map<string, Set<string>>
): boolean {
  const tags = (p.recipient_tags as string[] | null) ?? [];
  if (f.audience.length && !f.audience.some((a) => tags.includes(a))) return false;
  if (f.size.length) {
    const own = sizesByProduct?.get(p.id);
    if (!own || !f.size.some((s) => own.has(s))) return false;
  }
  if (f.color.length && !(p.color && f.color.includes(p.color))) return false;
  // Bands share edges and the upper bound is exclusive — see inBudgetRange().
  // Never replace this with a raw min/max comparison.
  if (f.budget.length && !f.budget.some((b) => inBudgetRange(Number(p.price), budgetBySlug(b))))
    return false;
  if (f.storeId.length && !(p.partner?.id && f.storeId.includes(p.partner.id))) return false;
  if (f.category.length && !(p.category?.slug && f.category.includes(p.category.slug))) return false;
  if (f.subcategory.length && !(p.subcategory?.slug && f.subcategory.includes(p.subcategory.slug)))
    return false;
  // Same rule as the card badge: the store offers same-day AND there is
  // stock. An unknown stock count never earns the promise.
  if (f.sameDayOnly && !(p.same_day === true && (p.stock_quantity ?? 0) > 0)) return false;
  return true;
}

export function countActive(f: CategoryFilters): number {
  return LIST_KEYS.reduce((n, k) => n + f[k].length, 0) + (f.sameDayOnly ? 1 : 0);
}

/** Add or drop one value inside one group. */
export function toggleFilter(
  f: CategoryFilters,
  key: ListKey,
  value: string
): CategoryFilters {
  const list = f[key];
  return { ...f, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
}

/** What the removable chips under the bar do. `value` is undefined for the
 *  one boolean group. */
export function removeFilter(
  f: CategoryFilters,
  key: keyof CategoryFilters,
  value?: string
): CategoryFilters {
  if (key === "sameDayOnly") return { ...f, sameDayOnly: false };
  const list = f[key as ListKey];
  return { ...f, [key]: value == null ? [] : list.filter((v) => v !== value) };
}

export type ActiveFilterChip = {
  /** Stable across renders so React keys don't collide between groups. */
  id: string;
  key: keyof CategoryFilters;
  value?: string;
  label: string;
};

export function filterLabels(
  f: CategoryFilters,
  ctx: {
    stores?: { id: string; name: string }[];
    categories?: { value: string; label: string }[];
    subcategories?: { value: string; label: string }[];
  }
): ActiveFilterChip[] {
  const out: ActiveFilterChip[] = [];
  const push = (key: ListKey, value: string, label: string) =>
    out.push({ id: `${key}:${value}`, key, value, label });

  for (const v of f.audience) push("audience", v, AUDIENCES.find((a) => a.value === v)?.label ?? v);
  for (const v of f.category)
    push("category", v, ctx.categories?.find((c) => c.value === v)?.label ?? v);
  for (const v of f.subcategory)
    push("subcategory", v, ctx.subcategories?.find((s) => s.value === v)?.label ?? v);
  for (const v of f.color) push("color", v, v);
  for (const v of f.budget) push("budget", v, budgetBySlug(v)?.label ?? v);
  for (const v of f.size) push("size", v, v);
  for (const v of f.storeId)
    push("storeId", v, ctx.stores?.find((s) => s.id === v)?.name ?? "Store");
  if (f.sameDayOnly) out.push({ id: "sameDayOnly", key: "sameDayOnly", label: "Arrives today" });
  return out;
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line py-5 first:pt-1 last:border-b-0">
      <p className="text-eyebrow uppercase text-muted">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/**
 * One option. A checkbox in behaviour and in semantics (role/aria-checked),
 * drawn as a pill so the panel stays in the site's chip language rather than
 * introducing a second control style. The tick is what says "you can pick
 * more than one" — a filled pill on its own reads as a radio.
 */
function OptionBox({
  checked,
  onToggle,
  count,
  swatch,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  count: number;
  swatch?: { background: string } | null;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-pill border px-4 text-caption font-medium transition-all duration-press ease-out active:scale-[0.97] ${
        checked
          ? "border-primary bg-primary text-inverse"
          : "border-line bg-surface text-ink hover:bg-surface-sunk"
      }`}
    >
      {swatch !== undefined ? (
        <span
          aria-hidden
          /* ring-black/15 rather than ring-ink/15 on purpose: this hairline
             sits on top of arbitrary swatch colours to stop pale ones
             vanishing, so it wants neutral black, not the warm ink the rest
             of the UI is drawn in. */
          className="h-[16px] w-[16px] shrink-0 rounded-pill ring-1 ring-inset ring-black/15"
          style={swatch ?? { background: "rgb(var(--surface-sunk))" }}
        />
      ) : null}
      <span
        aria-hidden
        className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-sm border text-[11px] leading-none ${
          checked ? "border-inverse bg-inverse text-primary" : "border-line"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      {children}
      <span className={checked ? "opacity-70" : "text-muted"}>{count}</span>
    </button>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Everything in view, unfiltered — counts are computed from this. */
  rows: FilterableProduct[];
  stores?: { id: string; name: string }[];
  /**
   * Top-level categories. Pass these ONLY on screens that are not already
   * inside one category (search, gift finder) — on /category/:slug the group
   * would have exactly one option and filter nothing.
   */
  categories?: { value: string; label: string }[];
  subcategories?: { value: string; label: string }[];
  variants?: VariantOptions;
  filters: CategoryFilters;
  onApply: (next: CategoryFilters) => void;
};

/**
 * The filter panel. Draft-then-apply rather than instant: unlike the chip
 * rails, this is a multi-group form, and re-sorting the grid under a sheet
 * you can't see is disorienting. The count on the Show button is live, so
 * you can see what a tick costs you before you commit to it.
 *
 * Every group is data-driven. An option whose live count is 0 is not
 * rendered at all (unless it is the one currently ticked, so you can still
 * see and clear it), and a whole group disappears when it has nothing real
 * behind it. That is why Size is invisible today.
 */
export function CategoryFilterPanel({
  open,
  onClose,
  rows,
  stores = [],
  categories = [],
  subcategories = [],
  variants,
  filters,
  onApply,
}: Props) {
  const [draft, setDraft] = useState<CategoryFilters>(filters);
  // Reseed every time it opens: the sheet must always start from what the
  // grid is actually showing, never from a half-edited previous visit.
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const sizes = variants?.byProduct;

  /**
   * The count a tick would leave you with — computed with the OTHER groups
   * applied, and with this group's own selection replaced rather than added
   * to. That is what makes "Her 12" mean twelve, whatever else is ticked.
   */
  const countWith = (patch: Partial<CategoryFilters>) =>
    rows.filter((p) => productMatches(p, { ...draft, ...patch }, sizes)).length;
  const countIn = (key: ListKey, value: string) => countWith({ [key]: [value] } as Partial<CategoryFilters>);
  const total = rows.filter((p) => productMatches(p, draft, sizes)).length;

  const on = (key: ListKey, value: string) => draft[key].includes(value);
  const flip = (key: ListKey, value: string) => setDraft((d) => toggleFilter(d, key, value));

  const audienceOptions = AUDIENCES.filter((a) => countIn("audience", a.value) > 0 || on("audience", a.value));
  const sizeOptions = (variants?.options ?? []).filter((s) => countIn("size", s) > 0 || on("size", s));
  const categoryOptions = categories.filter((c) => countIn("category", c.value) > 0 || on("category", c.value));
  const subcategoryOptions = subcategories.filter(
    (s) => countIn("subcategory", s.value) > 0 || on("subcategory", s.value)
  );
  const storeOptions = stores.filter((s) => countIn("storeId", s.id) > 0 || on("storeId", s.id));

  /**
   * Colour options come out of the rows in view, never from a list in the
   * code — so a screen only ever offers the colours it actually stocks.
   * Commonest first, ties alphabetical.
   */
  const colorOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of rows) {
      const c = p.color?.trim();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name)
      .filter((name) => countIn("color", name) > 0 || on("color", name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, draft, sizes]);

  const dirty = countActive(draft) > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter"
      fullHeight
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDraft(NO_FILTERS)}
            disabled={!dirty}
            className="inline-flex h-[52px] shrink-0 items-center rounded-pill px-4 text-body font-medium text-muted underline underline-offset-4 transition disabled:opacity-40 enabled:hover:text-ink"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="inline-flex h-[52px] flex-1 items-center justify-center rounded-pill bg-primary text-body font-medium text-inverse transition-all duration-press ease-out active:scale-[0.98]"
          >
            Show {total} {total === 1 ? "gift" : "gifts"}
          </button>
        </div>
      }
    >
      {/* For — the one group that maps to a tag every product already
          carries, and the one people reach for first. */}
      {audienceOptions.length ? (
        <FilterGroup label="For">
          {audienceOptions.map((a) => (
            <OptionBox
              key={a.value}
              checked={on("audience", a.value)}
              onToggle={() => flip("audience", a.value)}
              count={countIn("audience", a.value)}
            >
              {a.label}
            </OptionBox>
          ))}
        </FilterGroup>
      ) : null}

      {/* Category. Only rendered where the caller passed options — i.e. not
          on a page that is already inside one category. */}
      {categoryOptions.length > 1 ? (
        <FilterGroup label="Category">
          {categoryOptions.map((c) => (
            <OptionBox
              key={c.value}
              checked={on("category", c.value)}
              onToggle={() => flip("category", c.value)}
              count={countIn("category", c.value)}
            >
              {c.label}
            </OptionBox>
          ))}
        </FilterGroup>
      ) : null}

      {subcategoryOptions.length > 1 ? (
        <FilterGroup label="Type">
          {subcategoryOptions.map((s) => (
            <OptionBox
              key={s.value}
              checked={on("subcategory", s.value)}
              onToggle={() => flip("subcategory", s.value)}
              count={countIn("subcategory", s.value)}
            >
              {s.label}
            </OptionBox>
          ))}
        </FilterGroup>
      ) : null}

      {/* Colour. Options are whatever products.color actually holds for the
          gifts in view — nothing is offered that has no match. Names with no
          swatch in the table above still render, with a neutral dot. */}
      {colorOptions.length ? (
        <FilterGroup label="Colour">
          {colorOptions.map((c) => (
            <OptionBox
              key={c}
              checked={on("color", c)}
              onToggle={() => flip("color", c)}
              count={countIn("color", c)}
              swatch={swatchStyle(c)}
            >
              {c}
            </OptionBox>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup label="Price">
        {BUDGETS.map((b) => {
          const n = countIn("budget", b.slug);
          if (n === 0 && !on("budget", b.slug)) return null;
          return (
            <OptionBox
              key={b.slug}
              checked={on("budget", b.slug)}
              onToggle={() => flip("budget", b.slug)}
              count={n}
            >
              {b.label}
            </OptionBox>
          );
        })}
      </FilterGroup>

      {/* Size. Real variant names or nothing — never an invented S/M/L rail.
          product_variants is empty in production, so this renders nothing
          today and lights up by itself the first time a partner adds one. */}
      {sizeOptions.length ? (
        <FilterGroup label="Size">
          {sizeOptions.map((s) => (
            <OptionBox
              key={s}
              checked={on("size", s)}
              onToggle={() => flip("size", s)}
              count={countIn("size", s)}
            >
              {s}
            </OptionBox>
          ))}
        </FilterGroup>
      ) : null}

      {storeOptions.length > 1 ? (
        <FilterGroup label="Store">
          {storeOptions.map((s) => (
            <OptionBox
              key={s.id}
              checked={on("storeId", s.id)}
              onToggle={() => flip("storeId", s.id)}
              count={countIn("storeId", s.id)}
            >
              {s.name}
            </OptionBox>
          ))}
        </FilterGroup>
      ) : null}

      <div className="flex min-h-[52px] items-center justify-between gap-4 py-5">
        <span className="text-body font-medium">
          Arrives today only
          <span className="mt-0.5 block text-caption font-normal text-muted">
            In stock and out for same-day delivery.
          </span>
        </span>
        <button
          role="switch"
          aria-checked={draft.sameDayOnly}
          aria-label="Arrives today only"
          onClick={() => setDraft((d) => ({ ...d, sameDayOnly: !d.sameDayOnly }))}
          /* Explicit pixels: this project's spacing scale maps 8 to 64px and
             6 to 32px, so h-8/h-6 would build a switch twice the size.
             `.tap-44` lifts the 32px-tall control to a legal 44px target
             without making it look chunky — safe here because the only thing
             beside it is a non-interactive label, so the invisible overlay
             cannot steal a neighbour's tap. */
          className={`tap-44 relative h-[32px] w-[52px] shrink-0 rounded-pill transition-colors ${
            draft.sameDayOnly ? "bg-primary" : "bg-surface-sunk"
          }`}
        >
          <span
            className={`absolute top-1 h-[24px] w-[24px] rounded-pill bg-surface shadow-rest transition-all ${
              draft.sameDayOnly ? "left-[24px]" : "left-1"
            }`}
          />
        </button>
      </div>
    </Sheet>
  );
}
