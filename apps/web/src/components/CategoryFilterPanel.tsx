import { useEffect, useMemo, useState } from "react";
import { Button, Chip, Sheet } from "./ui";
import { AUDIENCES, BUDGETS, budgetBySlug, inBudgetRange } from "../lib/filters";
import type { VariantOptions } from "../hooks/useProducts";

/**
 * One filter model, one matcher, one panel — shared by the category page and
 * by the in-place category view on the homepage. They used to be able to
 * drift; now a group added here appears in both or in neither.
 *
 * EVERY GROUP HERE IS BACKED BY A COLUMN THAT ACTUALLY HAS VALUES IN IT.
 * Verified against the live database on 2026-08-11:
 *   Gender -> products.recipient_tags   him 12, her 20, child 12 of 47 active
 *   Colour -> products.color            32 of 47 active carry a value
 *   Size   -> product_variants.name     ZERO rows exist yet, so the group
 *                                       does not render at all
 * Nothing in this file hardcodes an option list. Options are derived from
 * the rows actually in view, and an option whose count is 0 is not shown, so
 * a filter can never lead to a guaranteed-empty screen.
 */
export type CategoryFilters = {
  /** A recipient_tag: him / her / child. Surfaced as "Gender". */
  audience: string | null;
  /** A product_variants.name. Empty in production today — see useProducts. */
  size: string | null;
  /** products.color, matched on the exact stored string. */
  color: string | null;
  budget: string | null;
  storeId: string | null;
  subcategory: string | null;
  sameDayOnly: boolean;
};

export const NO_FILTERS: CategoryFilters = {
  audience: null,
  size: null,
  color: null,
  budget: null,
  storeId: null,
  subcategory: null,
  sameDayOnly: false,
};

/** The minimum a product row has to look like to be filterable. */
export type FilterableProduct = {
  id: string;
  price: number | string;
  recipient_tags?: string[] | null;
  color?: string | null;
  same_day?: boolean | null;
  stock_quantity?: number | null;
  partner?: { id?: string | null } | null;
  subcategory?: { slug?: string | null } | null;
};

/**
 * How a colour NAME is drawn as a dot. This is not an option list — the
 * options come from products.color — it only decides what swatch to paint
 * next to a name the database already gave us. A colour with no entry here
 * still renders, just as a plain text chip, so new values from the dashboard
 * are never dropped.
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

function ColorSwatch({ name }: { name: string }) {
  const key = name.trim().toLowerCase();
  const hex = SWATCH[key];
  const multi = key === "multicolour" || key === "multicolor";
  if (!hex && !multi) return null;
  return (
    <span
      aria-hidden
      /* ring-black/15 rather than ring-ink/15. This used to be forced —
         alpha on a token colour compiled to no rule at all — but the tokens
         are channel triples now, so `ring-ink/15` would work. Kept as black
         on purpose: this hairline sits on top of arbitrary swatch colours to
         stop pale ones vanishing, so it wants neutral black, not the warm
         ink that the rest of the UI is drawn in. */
      className="h-[14px] w-[14px] shrink-0 rounded-pill ring-1 ring-inset ring-black/15"
      style={{
        background: multi
          ? "conic-gradient(#b23a34,#e2c14e,#4f7d5a,#4a7ab0,#7b5f97,#b23a34)"
          : hex,
      }}
    />
  );
}

/** The single matcher. Every grid and every count in the panel runs this,
 *  so a number in the panel is exactly what tapping it will give you. */
export function productMatches(
  p: FilterableProduct,
  f: CategoryFilters,
  sizesByProduct?: Map<string, Set<string>>
): boolean {
  if (f.audience && !(p.recipient_tags as string[] | null)?.includes(f.audience)) return false;
  if (f.size && !sizesByProduct?.get(p.id)?.has(f.size)) return false;
  if (f.color && p.color !== f.color) return false;
  if (f.budget && !inBudgetRange(Number(p.price), budgetBySlug(f.budget))) return false;
  if (f.storeId && p.partner?.id !== f.storeId) return false;
  if (f.subcategory && p.subcategory?.slug !== f.subcategory) return false;
  // Same rule as the card badge: the store offers same-day AND there is
  // stock. An unknown stock count never earns the promise.
  if (f.sameDayOnly && !(p.same_day === true && (p.stock_quantity ?? 0) > 0)) return false;
  return true;
}

export function countActive(f: CategoryFilters): number {
  return (
    (f.audience ? 1 : 0) +
    (f.size ? 1 : 0) +
    (f.color ? 1 : 0) +
    (f.budget ? 1 : 0) +
    (f.storeId ? 1 : 0) +
    (f.subcategory ? 1 : 0) +
    (f.sameDayOnly ? 1 : 0)
  );
}

export function filterLabels(
  f: CategoryFilters,
  ctx: {
    stores?: { id: string; name: string }[];
    subcategories?: { value: string; label: string }[];
  }
): { key: keyof CategoryFilters; label: string }[] {
  const out: { key: keyof CategoryFilters; label: string }[] = [];
  if (f.audience) out.push({ key: "audience", label: AUDIENCES.find((a) => a.value === f.audience)?.label ?? "" });
  if (f.size) out.push({ key: "size", label: f.size });
  if (f.color) out.push({ key: "color", label: f.color });
  if (f.budget) out.push({ key: "budget", label: budgetBySlug(f.budget)?.label ?? "" });
  if (f.storeId)
    out.push({ key: "storeId", label: ctx.stores?.find((s) => s.id === f.storeId)?.name ?? "Store" });
  if (f.subcategory)
    out.push({
      key: "subcategory",
      label: ctx.subcategories?.find((s) => s.value === f.subcategory)?.label ?? "",
    });
  if (f.sameDayOnly) out.push({ key: "sameDayOnly", label: "Arrives today" });
  return out;
}

function FilterGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first:mt-1">
      <p className="text-eyebrow uppercase text-muted">{label}</p>
      {hint ? <p className="mt-1 text-caption text-muted">{hint}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Everything in the category, unfiltered — counts are computed from this. */
  rows: FilterableProduct[];
  stores: { id: string; name: string }[];
  subcategories: { value: string; label: string }[];
  variants?: VariantOptions;
  filters: CategoryFilters;
  onApply: (next: CategoryFilters) => void;
};

/**
 * The filter panel. Draft-then-apply rather than instant: unlike the chip
 * rails, this is a multi-group form, and re-sorting the grid under a sheet
 * you can't see is disorienting.
 *
 * Every group is data-driven. An option whose live count is 0 is not
 * rendered at all (unless it is the one currently selected, so you can still
 * see and clear it), and a whole group disappears when it has nothing real
 * behind it. That is why Sizes is invisible today.
 */
export function CategoryFilterPanel({
  open,
  onClose,
  rows,
  stores,
  subcategories,
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
  const countWith = (patch: Partial<CategoryFilters>) =>
    rows.filter((p) => productMatches(p, { ...draft, ...patch }, sizes)).length;
  const total = rows.filter((p) => productMatches(p, draft, sizes)).length;

  const toggle = <K extends keyof CategoryFilters>(key: K, value: CategoryFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: d[key] === value ? null : value }));

  const genders = AUDIENCES.filter((a) => countWith({ audience: a.value }) > 0 || draft.audience === a.value);
  const sizeOptions = (variants?.options ?? []).filter(
    (s) => countWith({ size: s }) > 0 || draft.size === s
  );

  /**
   * Colour options come out of the rows in view, never from a list in the
   * code — so a category only ever offers the colours it actually stocks.
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
      .filter((name) => countWith({ color: name }) > 0 || draft.color === name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, draft, sizes]);

  return (
    <Sheet open={open} onClose={onClose} title="Filters">
      {/* Gender first — it is the one people reach for in Fashion and Shoes,
          and it is the only group here that maps to a tag every product
          already carries. */}
      {genders.length ? (
        <FilterGroup label="Gender">
          {genders.map((a) => (
            <Chip
              key={a.value}
              active={draft.audience === a.value}
              onClick={() => toggle("audience", a.value)}
              className="!px-4 !text-caption"
            >
              {a.label}
              <span className="opacity-60">{countWith({ audience: a.value })}</span>
            </Chip>
          ))}
        </FilterGroup>
      ) : null}

      {/* Sizes. Real variant names or nothing — never an invented S/M/L rail.
          Renders only when partners have actually added variants. */}
      {sizeOptions.length ? (
        <FilterGroup label="Size">
          {sizeOptions.map((s) => (
            <Chip
              key={s}
              active={draft.size === s}
              onClick={() => toggle("size", s)}
              className="!px-4 !text-caption"
            >
              {s}
              <span className="opacity-60">{countWith({ size: s })}</span>
            </Chip>
          ))}
        </FilterGroup>
      ) : null}

      {/* Colour. Options are whatever products.color actually holds for the
          gifts in this category — nothing is offered that has no match. */}
      {colorOptions.length ? (
        <FilterGroup label="Colour">
          {colorOptions.map((c) => (
            <Chip
              key={c}
              active={draft.color === c}
              onClick={() => toggle("color", c)}
              className="!px-4 !text-caption"
            >
              <ColorSwatch name={c} />
              {c}
              <span className="opacity-60">{countWith({ color: c })}</span>
            </Chip>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup label="Budget">
        {BUDGETS.map((b) => {
          const n = countWith({ budget: b.slug });
          if (n === 0 && draft.budget !== b.slug) return null;
          return (
            <Chip
              key={b.slug}
              active={draft.budget === b.slug}
              onClick={() => toggle("budget", b.slug)}
              className="!px-4 !text-caption"
            >
              {b.label}
              <span className="opacity-60">{n}</span>
            </Chip>
          );
        })}
      </FilterGroup>

      {subcategories.length > 1 ? (
        <FilterGroup label="Type">
          {subcategories.map((s) => {
            const n = countWith({ subcategory: s.value });
            if (n === 0 && draft.subcategory !== s.value) return null;
            return (
              <Chip
                key={s.value}
                active={draft.subcategory === s.value}
                onClick={() => toggle("subcategory", s.value)}
                className="!px-4 !text-caption"
              >
                {s.label}
                <span className="opacity-60">{n}</span>
              </Chip>
            );
          })}
        </FilterGroup>
      ) : null}

      {stores.length > 1 ? (
        <FilterGroup label="Store">
          {stores.map((s) => {
            const n = countWith({ storeId: s.id });
            if (n === 0 && draft.storeId !== s.id) return null;
            return (
              <Chip
                key={s.id}
                active={draft.storeId === s.id}
                onClick={() => toggle("storeId", s.id)}
                className="!px-4 !text-caption"
              >
                {s.name}
                <span className="opacity-60">{n}</span>
              </Chip>
            );
          })}
        </FilterGroup>
      ) : null}

      <div className="mt-5 flex min-h-[52px] items-center justify-between gap-4 border-t border-line pt-4">
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

      <div className="mt-5 flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => setDraft(NO_FILTERS)}>
          Clear all
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            onApply(draft);
            onClose();
          }}
        >
          Show {total}
        </Button>
      </div>
    </Sheet>
  );
}
