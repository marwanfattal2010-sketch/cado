import { useEffect, useMemo, useState } from "react";
import type { FeedProduct } from "../../../lib/browse";
import { OCCASIONS, RECIPIENTS } from "../../../lib/filters";
import { formatMoney } from "../../../lib/money";
import {
  EMPTY_FILTER,
  SORTS,
  activeCount,
  applyFilter,
  isEmptyFilter,
  optionCount,
  toggle,
  type Sort,
  type TabFilter,
} from "../../../lib/tabFilter";

/**
 * The sort + filter bar and its sheet (spec 2.11).
 *
 * This replaces the old chip bar — Recommended / Most Popular / Price /
 * Filter with big persimmon category chips — which had two problems the spec
 * names: the chips replaced each other instead of combining, and tapping one
 * could land on an empty grid.
 *
 * Both are fixed by the same rule: an option is only OFFERED when it has a
 * count, and its count is computed with its own group lifted out (see
 * `optionCount`). An option that would return nothing is not rendered, so
 * there is no path through this sheet to an empty result.
 *
 * MOBILE RULE, deliberately: ticking boxes does not touch the grid. The sheet
 * holds a draft, the footer button says how many that draft would show, and
 * the results change on tap. Live-applying under a full-height sheet means
 * re-rendering a grid nobody can see, and it makes "Clear all" ambiguous.
 */

type Group = { key: string; label: string; count: number };

export function TabFilterBar({
  products,
  filter,
  onFilter,
  sort,
  onSort,
  resultCount,
  stores,
  subcategories,
}: {
  products: FeedProduct[];
  filter: TabFilter;
  onFilter: (f: TabFilter) => void;
  sort: Sort;
  onSort: (s: Sort) => void;
  resultCount: number;
  stores: { id: string; name: string }[];
  subcategories: { id: string; name: string }[];
}) {
  const [sheet, setSheet] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const n = activeCount(filter);

  return (
    <>
      {/* Sticky under the tab row. `top-0` is enough: the panel is its own
          scroll container, so 0 is the first line under the fixed chrome. */}
      <div className="sticky top-0 z-10 -mx-[var(--page-x)] border-y border-line bg-canvas/95 px-[var(--page-x)] py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              className="tap-44 flex items-center gap-1 py-1 text-[13px] font-medium text-ink"
            >
              Sort: {SORTS.find((s) => s.value === sort)?.label}
              <span aria-hidden className="text-[10px] text-muted">▾</span>
            </button>
            {sortOpen ? (
              <>
                <button
                  aria-label="Close sort"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setSortOpen(false)}
                />
                <div className="absolute left-0 top-full z-20 mt-1 w-[180px] overflow-hidden rounded-card border border-line bg-surface shadow-lift">
                  {SORTS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        onSort(s.value);
                        setSortOpen(false);
                      }}
                      className={`flex h-10 w-full items-center px-3 text-left text-[13px] ${
                        s.value === sort ? "bg-surface-sunk font-semibold text-persimmon" : "text-ink"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <span className="text-[12px] text-muted">
            {resultCount} {resultCount === 1 ? "gift" : "gifts"}
          </span>

          <button
            type="button"
            onClick={() => setSheet(true)}
            className="tap-44 flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-[13px] font-semibold text-ink"
          >
            Filter
            {n > 0 ? (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-persimmon px-1 text-[11px] font-bold text-white">
                {n}
              </span>
            ) : null}
          </button>
        </div>

        <AppliedChips
          filter={filter}
          onFilter={onFilter}
          stores={stores}
          subcategories={subcategories}
        />
      </div>

      {sheet ? (
        <FilterSheet
          products={products}
          initial={filter}
          stores={stores}
          subcategories={subcategories}
          onClose={() => setSheet(false)}
          onApply={(f) => {
            onFilter(f);
            setSheet(false);
          }}
        />
      ) : null}
    </>
  );
}

/** Applied filters, always visible while active (2.11). */
function AppliedChips({
  filter,
  onFilter,
  stores,
  subcategories,
}: {
  filter: TabFilter;
  onFilter: (f: TabFilter) => void;
  stores: { id: string; name: string }[];
  subcategories: { id: string; name: string }[];
}) {
  if (isEmptyFilter(filter)) return null;

  const chips: { label: string; clear: () => void }[] = [];
  for (const v of filter.recipients)
    chips.push({
      label: RECIPIENTS.find((r) => r.value === v)?.label ?? v,
      clear: () => onFilter({ ...filter, recipients: toggle(filter.recipients, v) }),
    });
  for (const v of filter.occasions)
    chips.push({
      label: OCCASIONS.find((o) => o.value === v)?.label ?? v,
      clear: () => onFilter({ ...filter, occasions: toggle(filter.occasions, v) }),
    });
  for (const v of filter.types)
    chips.push({
      label: subcategories.find((s) => s.id === v)?.name ?? "Type",
      clear: () => onFilter({ ...filter, types: toggle(filter.types, v) }),
    });
  for (const v of filter.stores)
    chips.push({
      label: stores.find((s) => s.id === v)?.name ?? "Store",
      clear: () => onFilter({ ...filter, stores: toggle(filter.stores, v) }),
    });
  for (const m of filter.priceMax)
    chips.push({
      label: `Under $${m}`,
      clear: () => onFilter({ ...filter, priceMax: filter.priceMax.filter((x) => x !== m) }),
    });
  if (filter.min != null || filter.max != null)
    chips.push({
      label: `${filter.min != null ? formatMoney(filter.min) : "$0"} – ${
        filter.max != null ? formatMoney(filter.max) : "any"
      }`,
      clear: () => onFilter({ ...filter, min: null, max: null }),
    });
  if (filter.giftReady)
    chips.push({ label: "Ready to gift", clear: () => onFilter({ ...filter, giftReady: false }) });
  if (filter.onSale)
    chips.push({ label: "On sale", clear: () => onFilter({ ...filter, onSale: false }) });

  return (
    <div className="scroll-row mt-2" style={{ ["--row-gap" as string]: "6px" }}>
      {chips.map((c, i) => (
        <button
          key={`${c.label}-${i}`}
          type="button"
          onClick={c.clear}
          className="flex h-7 shrink-0 items-center gap-1 rounded-pill border border-persimmon px-2.5 text-[12px] font-medium text-persimmon"
        >
          {c.label}
          <span aria-hidden>×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onFilter(EMPTY_FILTER)}
        className="h-7 shrink-0 px-1 text-[12px] font-medium text-muted underline underline-offset-2"
      >
        Clear all
      </button>
    </div>
  );
}

function FilterSheet({
  products,
  initial,
  stores,
  subcategories,
  onClose,
  onApply,
}: {
  products: FeedProduct[];
  initial: TabFilter;
  stores: { id: string; name: string }[];
  subcategories: { id: string; name: string }[];
  onClose: () => void;
  onApply: (f: TabFilter) => void;
}) {
  const [draft, setDraft] = useState<TabFilter>(initial);
  // For and Price open; everything else collapsed (2.11).
  const [open, setOpen] = useState<Record<string, boolean>>({ for: true, price: true });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const shown = applyFilter(products, draft).length;

  const recipientOpts = useMemo<Group[]>(
    () =>
      RECIPIENTS.map((r) => ({
        key: r.value,
        label: r.label,
        count: optionCount(products, draft, "recipients", (p) =>
          (p.recipient_tags ?? []).includes(r.value)
        ),
      })).filter((g) => g.count > 0),
    [products, draft]
  );

  const occasionOpts = useMemo<Group[]>(
    () =>
      OCCASIONS.map((o) => ({
        key: o.value,
        label: o.label,
        count: optionCount(products, draft, "occasions", (p) =>
          (p.occasion_tags ?? []).includes(o.value)
        ),
      })).filter((g) => g.count > 0),
    [products, draft]
  );

  const typeOpts = useMemo<Group[]>(
    () =>
      subcategories
        .map((s) => ({
          key: s.id,
          label: s.name,
          count: optionCount(products, draft, "types", (p) => p.subcategory_id === s.id),
        }))
        .filter((g) => g.count > 0),
    [products, draft, subcategories]
  );

  const storeOpts = useMemo<Group[]>(
    () =>
      stores
        .map((s) => ({
          key: s.id,
          label: s.name,
          count: optionCount(products, draft, "stores", (p) => p.partner_id === s.id),
        }))
        .filter((g) => g.count > 0),
    [products, draft, stores]
  );

  const priceOpts = useMemo<Group[]>(
    () =>
      [30, 50, 100, 200]
        .map((m) => ({
          key: String(m),
          label: `Under $${m}`,
          count: optionCount(products, draft, "priceMax", (p) => p.price < m),
        }))
        .filter((g) => g.count > 0),
    [products, draft]
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button aria-label="Close filters" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] flex-col rounded-t-[20px] bg-canvas">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-hero text-[17px] font-extrabold text-ink">Filter</h2>
          <button onClick={onClose} aria-label="Close" className="tap-44 text-[20px] text-muted">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <Section
            id="for"
            title="For"
            open={open}
            setOpen={setOpen}
            options={recipientOpts}
            selected={draft.recipients}
            onToggle={(k) => setDraft({ ...draft, recipients: toggle(draft.recipients, k) })}
          />
          <Section
            id="price"
            title="Price"
            open={open}
            setOpen={setOpen}
            options={priceOpts}
            selected={draft.priceMax.map(String)}
            onToggle={(k) =>
              setDraft({
                ...draft,
                priceMax: draft.priceMax.includes(Number(k))
                  ? draft.priceMax.filter((x) => x !== Number(k))
                  : [...draft.priceMax, Number(k)],
              })
            }
          >
            <div className="flex items-center gap-2 pb-1 pt-2">
              <NumberBox
                label="Min"
                value={draft.min}
                onChange={(v) => setDraft({ ...draft, min: v })}
              />
              <span className="text-muted">–</span>
              <NumberBox
                label="Max"
                value={draft.max}
                onChange={(v) => setDraft({ ...draft, max: v })}
              />
            </div>
          </Section>
          <Section
            id="occasion"
            title="Occasion"
            open={open}
            setOpen={setOpen}
            options={occasionOpts}
            selected={draft.occasions}
            onToggle={(k) => setDraft({ ...draft, occasions: toggle(draft.occasions, k) })}
          />
          <Section
            id="type"
            title="Type"
            open={open}
            setOpen={setOpen}
            options={typeOpts}
            selected={draft.types}
            onToggle={(k) => setDraft({ ...draft, types: toggle(draft.types, k) })}
          />
          <Section
            id="store"
            title="Store"
            open={open}
            setOpen={setOpen}
            options={storeOpts}
            selected={draft.stores}
            onToggle={(k) => setDraft({ ...draft, stores: toggle(draft.stores, k) })}
          />
        </div>

        <div
          className="flex items-center gap-3 border-t border-line px-4 py-3"
          style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={() => setDraft(EMPTY_FILTER)}
            className="tap-44 shrink-0 text-[14px] font-medium text-muted underline underline-offset-4"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex h-12 flex-1 items-center justify-center rounded-pill bg-persimmon text-[15px] font-bold text-white transition-transform duration-press ease-out active:scale-[0.99]"
          >
            Show {shown} {shown === 1 ? "gift" : "gifts"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  open,
  setOpen,
  options,
  selected,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: Record<string, boolean>;
  setOpen: (f: (p: Record<string, boolean>) => Record<string, boolean>) => void;
  options: Group[];
  selected: string[];
  onToggle: (key: string) => void;
  children?: React.ReactNode;
}) {
  // A group with nothing behind it is not rendered at all — an empty
  // accordion row is a promise the catalogue cannot keep.
  if (options.length === 0 && !children) return null;
  const isOpen = open[id] ?? false;
  return (
    <div className="border-b border-line py-3 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((p) => ({ ...p, [id]: !isOpen }))}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-hero text-[15px] font-extrabold text-ink">{title}</span>
        <span aria-hidden className="text-[12px] text-muted">
          {isOpen ? "▴" : "▾"}
        </span>
      </button>
      {isOpen ? (
        <>
          <div className="flex flex-wrap gap-2 pt-3">
            {options.map((o) => {
              const on = selected.includes(o.key);
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => onToggle(o.key)}
                  className={`flex h-9 items-center gap-1.5 rounded-pill border px-3 text-[13px] transition ${
                    on
                      ? "border-persimmon bg-persimmon/10 font-semibold text-persimmon"
                      : "border-line text-ink"
                  }`}
                >
                  {o.label}
                  <span className={on ? "text-persimmon/70" : "text-muted"}>{o.count}</span>
                </button>
              );
            })}
          </div>
          {children}
        </>
      ) : null}
    </div>
  );
}

function NumberBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="flex h-10 flex-1 items-center gap-1 rounded-card border border-line bg-surface px-3">
      <span className="text-[12px] text-muted">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full bg-transparent text-[14px] text-ink outline-none"
      />
    </label>
  );
}
