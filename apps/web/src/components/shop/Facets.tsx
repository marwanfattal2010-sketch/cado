import { useEffect, useMemo, useState } from "react";
import { colourOf, flowerTypesOf, sizesOf, type FeedProduct } from "../../lib/browse";
import {
  FACETS_BY_CATEGORY,
  GROUP_LABEL,
  FLOWER_TYPES,
  PRICE_TIERS,
  RECIPIENTS,
  priceTier,
  type FacetGroup,
} from "../../lib/facets";
import { OCCASIONS } from "../../lib/filters";
import {
  emptyBrowse,
  matches,
  optionCount,
  toggleValue,
  type BrowseState,
  type ListKey,
  type Lookup,
} from "../../lib/browseParams";

/**
 * ONE FACET IMPLEMENTATION. Three ways in.
 *
 * The chip row, the single-facet sheet a chip opens, and the "Filter" sheet
 * that stacks everything all read the same options and write the same URL
 * params. There is deliberately no second copy: the earlier build had the tab
 * page and the results page each maintaining their own idea of a filter, which
 * is how tapping "Anniversary" came to erase "Him".
 *
 * THE SHAPE IS SHEIN'S, because it is the one shoppers already know: a row of
 * small dropdown chips, each opening only its own options, closeable in two
 * taps. The all-facets sheet stays for people who want to see everything at
 * once, but it is no longer the only door.
 *
 * A FACET STILL HAS TO EARN ITS PLACE. `visibleGroups` drops any facet with
 * fewer than two options that would actually return something in the category
 * being viewed — which is what keeps Colour off the ten tabs where nobody has
 * entered a real colour, without a hard-coded exception list.
 */

export type Option = { value: string; label: string; count: number };

/* -------------------------------------------------------------------------- */
/* The option model                                                           */
/* -------------------------------------------------------------------------- */

export function useFacets({
  products,
  state,
  lookup,
  subcategories,
  stores,
}: {
  /** Everything in this category, before filtering. */
  products: FeedProduct[];
  state: BrowseState;
  lookup: Lookup;
  subcategories: { slug: string; name: string }[];
  stores: { slug: string; name: string }[];
}) {
  /** Sizes and colours are whatever the catalogue actually holds, in a stable order. */
  const sizeValues = useMemo(() => {
    const seen = new Map<string, number>();
    for (const p of products) for (const s of sizesOf(p)) seen.set(s, (seen.get(s) ?? 0) + 1);
    return [...seen.keys()].sort(bySizeOrder);
  }, [products]);

  const flowerValues = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) for (const t of flowerTypesOf(p)) seen.add(t);
    return seen;
  }, [products]);

  const colourValues = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) {
      const c = colourOf(p);
      if (c) seen.add(c);
    }
    return [...seen].sort();
  }, [products]);

  const optionsFor = useMemo(() => {
    const build = (key: ListKey, raw: { value: string; label: string }[]): Option[] =>
      raw.map((o) => ({ ...o, count: optionCount(products, state, key, o.value, lookup) }));

    return {
      for: build("for", RECIPIENTS.map((r) => ({ value: r.value, label: r.full }))),
      occasion: build("occasion", OCCASIONS.map((o) => ({ value: o.value, label: o.label }))),
      price: build("price", PRICE_TIERS.map((t) => ({ value: t.id, label: t.label }))),
      type: build("type", subcategories.map((s) => ({ value: s.slug, label: s.name }))),
      size: build("size", sizeValues.map((s) => ({ value: s, label: s }))),
      colour: build("colour", colourValues.map((c) => ({ value: c, label: titleCase(c) }))),
      // Only the types this category actually stocks, in the canonical order,
      // so the sheet never offers Sunflowers to a shop that has none.
      flower: build(
        "flower",
        FLOWER_TYPES.filter((t) => flowerValues.has(t.value)).map((t) => ({
          value: t.value,
          label: t.label,
        }))
      ),
      store: build("store", stores.map((s) => ({ value: s.slug, label: s.name }))),
    } as Record<FacetGroup, Option[]>;
  }, [products, state, lookup, subcategories, stores, sizeValues, colourValues, flowerValues]);

  /*
   * WHICH CHIPS EXIST IS DECIDED BY THE CATEGORY, NOT BY THE SELECTION.
   *
   * Counted against the current selection, the row emptied itself: picking
   * "Under $50" on Flowers left three products, most facets dropped below two
   * live options, and five of the seven chips vanished — so the row you were
   * about to use disappeared underneath you the moment you used it, and there
   * was no way back to Occasion except Clear all.
   *
   * A facet earns its chip if the CATEGORY has two or more values for it. The
   * counts inside the sheet still respond to the selection, and an option that
   * would return nothing is still greyed — the chip just stops moving.
   */
  const base = useMemo(() => emptyBrowse(state.cat), [state.cat]);
  const declared = FACETS_BY_CATEGORY[state.cat] ?? ["price", "store"];
  const visibleGroups = useMemo(
    () =>
      declared.filter((g) => {
        const key = g as ListKey;
        const raw = optionsFor[g];
        return (
          raw.filter((o) => optionCount(products, base, key, o.value, lookup) > 0).length >= 2
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, base, lookup, optionsFor]
  );

  const countWith = (draft: BrowseState) =>
    products.filter((p) => matches(p, draft, lookup)).length;

  return { optionsFor, visibleGroups, countWith };
}

/** How many values are chosen in one facet — the number the chip shows. */
export function selectedIn(s: BrowseState, g: FacetGroup): string[] {
  if (g === "price") {
    // The tier's own label, so "$200 and up" does not come back as "Under $200".
    const tiers = s.price.map((v) => priceTier(v)?.label ?? v);
    if (s.min != null || s.max != null) tiers.push(`$${s.min ?? 0}–$${s.max ?? "∞"}`);
    return tiers;
  }
  return s[g as ListKey];
}

/** Clearing one facet, price included — it owns three params, not one. */
export function clearGroup(s: BrowseState, g: FacetGroup): BrowseState {
  if (g === "price") return { ...s, price: [], min: null, max: null };
  return { ...s, [g as ListKey]: [] };
}

/* -------------------------------------------------------------------------- */
/* Chip row                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * `For ▾` when nothing is chosen, `For: Him ▾` when one is, `For: Him +1 ▾`
 * when more. Putting the value on the chip is the entire point of the pattern:
 * you can read your whole selection off one row without opening anything.
 */
export function FacetChips({
  cat: _cat,
  state,
  onChange,
  facets,
  subcategories,
  stores,
  openOnMount,
  onOpened,
}: {
  cat: string;
  state: BrowseState;
  onChange: (next: BrowseState) => void;
  facets: ReturnType<typeof useFacets>;
  subcategories: { slug: string; name: string }[];
  stores: { slug: string; name: string }[];
  /** `?facet=occasion` — how "See all occasions" lands with the sheet already up. */
  openOnMount?: FacetGroup | null;
  onOpened?: () => void;
}) {
  const [open, setOpen] = useState<FacetGroup | null>(null);

  useEffect(() => {
    if (openOnMount && facets.visibleGroups.includes(openOnMount)) {
      setOpen(openOnMount);
      onOpened?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openOnMount, facets.visibleGroups.length]);

  const chipLabel = (g: FacetGroup) => {
    const chosen = selectedIn(state, g);
    if (!chosen.length) return GROUP_LABEL[g];
    const first = labelOf(g, chosen[0], { subcategories, stores });
    return chosen.length === 1
      ? `${GROUP_LABEL[g]}: ${first}`
      : `${GROUP_LABEL[g]}: ${first} +${chosen.length - 1}`;
  };

  return (
    <>
      <div className="scroll-row" style={{ ["--row-gap" as string]: "8px" }}>
        {facets.visibleGroups.map((g) => {
          const on = selectedIn(state, g).length > 0;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setOpen(g)}
              aria-expanded={open === g}
              className={`inline-flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-pill px-3 text-[13px] font-medium transition-transform duration-press ease-out active:scale-[0.97] ${
                on ? "bg-persimmon text-white" : "border border-ink/[0.12] bg-canvas text-ink"
              }`}
            >
              {chipLabel(g)}
              <span aria-hidden className={on ? "text-white/80" : "text-muted"}>
                ▾
              </span>
            </button>
          );
        })}
      </div>

      {open ? (
        <FacetSheet
          group={open}
          onClose={() => setOpen(null)}
          onApply={(next) => {
            setOpen(null);
            onChange(next);
          }}
          state={state}
          facets={facets}
        />
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* One facet, one short sheet                                                 */
/* -------------------------------------------------------------------------- */

function FacetSheet({
  group,
  onClose,
  onApply,
  state,
  facets,
}: {
  group: FacetGroup;
  onClose: () => void;
  onApply: (next: BrowseState) => void;
  state: BrowseState;
  facets: ReturnType<typeof useFacets>;
}) {
  const [draft, setDraft] = useState<BrowseState>(state);
  const n = facets.countWith(draft);

  /*
   * ONE TAP TO CHOOSE, and the sheet closes.
   *
   * The brief asks for open-choose-close in two taps, and a single-select
   * facet can honour that literally: choosing a price tier applies it and
   * shuts the sheet. Multi-select facets cannot — you would never get to pick
   * a second size — so they keep the footer button. Price is the single-select
   * one because tiers are nested: "Under $50" and "Under $100" together just
   * mean "Under $100".
   */
  const single = group === "price";

  return (
    <Sheet title={GROUP_LABEL[group]} onClose={onClose} maxHeight="62dvh">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <FacetBody
          group={group}
          draft={draft}
          setDraft={(fn) => {
            const next = fn(draft);
            setDraft(next);
            if (single) onApply(next);
          }}
          options={facets.optionsFor[group]}
        />
      </div>
      <SheetFooter
        clearLabel="Clear"
        onClear={() => setDraft((d) => clearGroup(d, group))}
        count={n}
        onShow={() => onApply(draft)}
      />
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Everything at once                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The `Filter ⛛` sheet: the same facets stacked as accordions, first one open.
 *
 * It exists for people who want the whole picture in one place, and it writes
 * the identical params the chips do — the two doors cannot disagree, because
 * behind both is `FacetBody` and `BrowseState`.
 */
export function AllFiltersSheet({
  open,
  onClose,
  onApply,
  state,
  facets,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (next: BrowseState) => void;
  state: BrowseState;
  facets: ReturnType<typeof useFacets>;
}) {
  const [draft, setDraft] = useState<BrowseState>(state);
  const [expanded, setExpanded] = useState<FacetGroup | null>(facets.visibleGroups[0] ?? null);

  useEffect(() => {
    if (open) {
      setDraft(state);
      setExpanded(facets.visibleGroups[0] ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const n = facets.countWith(draft);

  return (
    <Sheet title="Filter" onClose={onClose} maxHeight="88dvh">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {facets.visibleGroups.map((g) => {
          const chosen = selectedIn(draft, g);
          const isOpen = expanded === g;
          return (
            <section key={g} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : g)}
                aria-expanded={isOpen}
                className="flex h-12 w-full items-center gap-2 px-4 text-left"
              >
                <span className="text-body font-semibold text-ink">{GROUP_LABEL[g]}</span>
                {chosen.length ? (
                  <span className="rounded-pill bg-persimmon px-2 py-0.5 text-[10px] font-black text-white">
                    {chosen.length}
                  </span>
                ) : null}
                <span aria-hidden className="ml-auto text-muted">
                  {isOpen ? "▴" : "▾"}
                </span>
              </button>
              {isOpen ? (
                <FacetBody
                  group={g}
                  draft={draft}
                  setDraft={(fn) => setDraft(fn(draft))}
                  options={facets.optionsFor[g]}
                />
              ) : null}
            </section>
          );
        })}
      </div>
      <SheetFooter
        clearLabel="Clear all"
        onClear={() =>
          setDraft((d) =>
            facets.visibleGroups.reduce((acc, g) => clearGroup(acc, g), { ...d, tile: null })
          )
        }
        count={n}
        onShow={() => onApply(draft)}
      />
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Bodies                                                                     */
/* -------------------------------------------------------------------------- */

function FacetBody({
  group,
  draft,
  setDraft,
  options,
}: {
  group: FacetGroup;
  draft: BrowseState;
  setDraft: (fn: (d: BrowseState) => BrowseState) => void;
  options: Option[];
}) {
  if (group === "price") return <PriceBody draft={draft} setDraft={setDraft} options={options} />;
  if (group === "colour") return <ColourBody draft={draft} setDraft={setDraft} options={options} />;
  if (group === "size") return <SizeBody draft={draft} setDraft={setDraft} options={options} />;
  return <RowsBody group={group} draft={draft} setDraft={setDraft} options={options} />;
}

/** Label left, count right, checkbox far right. The default for most facets. */
function RowsBody({
  group,
  draft,
  setDraft,
  options,
}: {
  group: FacetGroup;
  draft: BrowseState;
  setDraft: (fn: (d: BrowseState) => BrowseState) => void;
  options: Option[];
}) {
  const key = group as ListKey;
  return (
    <ul>
      {options.map((o) => {
        const on = draft[key].includes(o.value);
        const dead = o.count === 0 && !on;
        return (
          <li key={o.value} className="border-b border-line last:border-0">
            <button
              type="button"
              disabled={dead}
              onClick={() => setDraft((d) => toggleValue(d, key, o.value))}
              className={`flex h-12 w-full items-center gap-2 px-4 text-left ${dead ? "opacity-35" : ""}`}
            >
              <span className={`min-w-0 flex-1 truncate text-body ${on ? "font-bold text-ink" : "text-ink"}`}>
                {o.label}
              </span>
              <span className="shrink-0 text-caption text-muted">{o.count}</span>
              <Tick on={on} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Tiers as rows, then a min/max pair under a divider. */
function PriceBody({
  draft,
  setDraft,
  options,
}: {
  draft: BrowseState;
  setDraft: (fn: (d: BrowseState) => BrowseState) => void;
  options: Option[];
}) {
  return (
    <div>
      <RowsBody group="price" draft={draft} setDraft={setDraft} options={options} />
      <div className="flex items-center gap-2 border-t border-line px-4 py-4">
        <input
          inputMode="numeric"
          placeholder="Min"
          value={draft.min ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, min: numOrNull(e.target.value) }))}
          className="h-11 w-full min-w-0 rounded-card border border-line bg-surface px-3 text-body"
        />
        <span aria-hidden className="text-muted">
          —
        </span>
        <input
          inputMode="numeric"
          placeholder="Max"
          value={draft.max ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, max: numOrNull(e.target.value) }))}
          className="h-11 w-full min-w-0 rounded-card border border-line bg-surface px-3 text-body"
        />
      </div>
    </div>
  );
}

/** Five per row: swatch, name underneath, persimmon ring when chosen. */
function ColourBody({
  draft,
  setDraft,
  options,
}: {
  draft: BrowseState;
  setDraft: (fn: (d: BrowseState) => BrowseState) => void;
  options: Option[];
}) {
  return (
    <div className="grid grid-cols-5 gap-3 px-4 py-4">
      {options.map((o) => {
        const on = draft.colour.includes(o.value);
        const dead = o.count === 0 && !on;
        return (
          <button
            key={o.value}
            type="button"
            disabled={dead}
            onClick={() => setDraft((d) => toggleValue(d, "colour", o.value))}
            className={`flex flex-col items-center gap-1 ${dead ? "opacity-35" : ""}`}
          >
            <span
              className={`h-9 w-9 rounded-pill border ${
                on ? "ring-2 ring-persimmon ring-offset-2" : "border-ink/15"
              }`}
              style={{ background: swatch(o.value) }}
            />
            <span className={`w-full truncate text-center text-[11px] ${on ? "font-bold text-ink" : "text-muted"}`}>
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Four per row, square chips. */
function SizeBody({
  draft,
  setDraft,
  options,
}: {
  draft: BrowseState;
  setDraft: (fn: (d: BrowseState) => BrowseState) => void;
  options: Option[];
}) {
  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-4">
      {options.map((o) => {
        const on = draft.size.includes(o.value);
        const dead = o.count === 0 && !on;
        return (
          <button
            key={o.value}
            type="button"
            disabled={dead}
            onClick={() => setDraft((d) => toggleValue(d, "size", o.value))}
            className={`flex h-11 items-center justify-center rounded-[8px] px-1 text-[13px] transition-transform duration-press ease-out active:scale-[0.97] ${
              dead ? "opacity-35" : ""
            } ${on ? "bg-persimmon font-bold text-white" : "border border-ink/[0.12] bg-canvas text-ink"}`}
          >
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

function Sheet({
  title,
  onClose,
  maxHeight,
  children,
}: {
  title: string;
  onClose: () => void;
  maxHeight: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40"
      role="dialog"
      aria-label={title}
    >
      <button type="button" aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="flex flex-col rounded-t-[18px] bg-canvas" style={{ maxHeight }}>
        <div className="shrink-0 px-4 pb-2 pt-2.5">
          <span aria-hidden className="mx-auto block h-1 w-10 rounded-pill bg-ink/15" />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-body font-semibold text-ink">{title}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap-44 px-2 text-[18px] text-muted"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col border-t border-line">{children}</div>
      </div>
    </div>
  );
}

function SheetFooter({
  clearLabel,
  onClear,
  count,
  onShow,
}: {
  clearLabel: string;
  onClear: () => void;
  count: number;
  onShow: () => void;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-3 border-t border-line px-4 py-3"
      style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={onClear}
        className="shrink-0 text-body font-medium text-muted underline underline-offset-4"
      >
        {clearLabel}
      </button>
      <button
        type="button"
        onClick={onShow}
        className="min-h-[46px] flex-1 rounded-pill bg-persimmon text-body font-semibold text-white"
      >
        Show {count} {count === 1 ? "gift" : "gifts"}
      </button>
    </div>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border text-[11px] font-black ${
        on ? "border-persimmon bg-persimmon text-white" : "border-ink/25 text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const numOrNull = (v: string) => (v === "" ? null : Number(v));

/**
 * The human name for one chosen value, for printing on a chip.
 *
 * `selectedIn` already hands back finished labels for price, so that case
 * passes straight through. Everything else is a slug or a tag that has to be
 * looked up — and looked up in the same places the sheets use, so the chip and
 * the row inside the sheet can never disagree about what a value is called.
 */
function labelOf(
  g: FacetGroup,
  value: string,
  refs: { subcategories: { slug: string; name: string }[]; stores: { slug: string; name: string }[] }
): string {
  switch (g) {
    case "for":
      return RECIPIENTS.find((r) => r.value === value)?.short ?? value;
    case "occasion":
      return OCCASIONS.find((o) => o.value === value)?.label ?? value;
    case "type":
      return refs.subcategories.find((s) => s.slug === value)?.name ?? value;
    case "store":
      return refs.stores.find((s) => s.slug === value)?.name ?? value;
    case "colour":
      return titleCase(value);
    case "flower":
      return FLOWER_TYPES.find((t) => t.value === value)?.label ?? value;
    default:
      // price arrives already formatted; size is its own label.
      return value;
  }
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * XS before S before M, 36 before 41, and anything unrecognised last in
 * alphabetical order — so a size list never comes out as "10, 4Y, 6Y, 8Y".
 */
const LETTER_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "ONE SIZE"];
function bySizeOrder(a: string, b: string): number {
  const na = Number(a.replace(/\D/g, ""));
  const nb = Number(b.replace(/\D/g, ""));
  const aNum = /\d/.test(a);
  const bNum = /\d/.test(b);
  if (aNum && bNum) return na - nb;
  if (aNum !== bNum) return aNum ? 1 : -1;
  const ia = LETTER_ORDER.indexOf(a.toUpperCase());
  const ib = LETTER_ORDER.indexOf(b.toUpperCase());
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

/**
 * A swatch for a colour name.
 *
 * Only names the catalogue actually uses need to be here; anything else gets a
 * neutral chip and still reads, because the name is printed underneath. That
 * is deliberate — an unknown colour showing grey with "Burgundy" written under
 * it is honest, whereas guessing a hex for it would not be.
 */
const SWATCH: Record<string, string> = {
  black: "#1a1a1a",
  white: "#f5f2ec",
  cream: "#efe7d8",
  grey: "#9a9a9a",
  gray: "#9a9a9a",
  silver: "#c8ccd0",
  gold: "#c9a227",
  rose: "#e8b4b8",
  pink: "#e79bb4",
  red: "#c33",
  burgundy: "#6d1a2e",
  orange: "#e2703a",
  yellow: "#e3c04a",
  green: "#4a7c59",
  blue: "#3b5f9e",
  navy: "#1f2a44",
  purple: "#6b4a86",
  brown: "#6b4a35",
  tan: "#c9a37e",
  beige: "#ddd0bb",
};
const swatch = (name: string) => SWATCH[name.toLowerCase()] ?? "rgb(var(--surface-sunk))";
