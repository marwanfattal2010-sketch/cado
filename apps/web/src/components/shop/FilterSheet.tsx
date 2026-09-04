import { useEffect, useMemo, useState } from "react";
import type { FeedProduct } from "../../lib/browse";
import {
  FACETS_BY_CATEGORY,
  GROUP_LABEL,
  PRICE_TIERS,
  RECIPIENTS,
  priceTierId,
  priceTierLabel,
  type FacetGroup,
} from "../../lib/facets";
import { OCCASIONS } from "../../lib/filters";
import {
  matches,
  optionCount,
  toggleValue,
  type BrowseState,
  type ListKey,
  type Lookup,
} from "../../lib/browseParams";

/**
 * THE filter sheet — one component, used everywhere, reading and writing the
 * same URL state as the page behind it. There is no second implementation.
 *
 * TWO PANES, ONE GROUP AT A TIME. The old panel stacked every group expanded
 * with counts floating beside every option, which on a phone is a wall. The
 * group names live in a rail on the left; only the active group's options are
 * rendered on the right. That is the whole reason it reads as simple.
 *
 * NOTHING IS APPLIED UNTIL "Show" IS TAPPED — except the footer count, which
 * is live so you can see the consequence of a tick before committing to it.
 * Closing by any other route discards the draft.
 */

type Option = { value: string; label: string; count: number };

export function FilterSheet({
  open,
  onClose,
  onApply,
  state,
  products,
  lookup,
  subcategories,
  stores,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (next: BrowseState) => void;
  state: BrowseState;
  /** Everything in this category, before filtering. */
  products: FeedProduct[];
  lookup: Lookup;
  subcategories: { slug: string; name: string }[];
  stores: { slug: string; name: string }[];
}) {
  const [draft, setDraft] = useState<BrowseState>(state);
  const groups = FACETS_BY_CATEGORY[state.cat] ?? ["price", "store"];
  const [active, setActive] = useState<FacetGroup>(groups[0]);

  // Reopening starts from what the page currently has, never from a stale draft.
  useEffect(() => {
    if (open) {
      setDraft(state);
      setActive(groups[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** Options per group, each with the count it WOULD return if added. */
  const optionsFor = useMemo(() => {
    const build = (key: ListKey, raw: { value: string; label: string }[]): Option[] =>
      raw
        .map((o) => ({ ...o, count: optionCount(products, draft, key, o.value, lookup) }))
        // Fewer than two distinct values is not a choice; the group is dropped
        // by the caller below.
        .filter((o) => o.count > 0 || draft[key].includes(o.value) || true);

    return {
      for: build(
        "for",
        RECIPIENTS.map((r) => ({ value: r.value, label: r.full }))
      ),
      occasion: build(
        "occasion",
        OCCASIONS.map((o) => ({ value: o.value, label: o.label }))
      ),
      price: build(
        "price",
        PRICE_TIERS.map((t) => ({ value: priceTierId(t), label: priceTierLabel(t) }))
      ),
      type: build("type", subcategories.map((s) => ({ value: s.slug, label: s.name }))),
      store: build("store", stores.map((s) => ({ value: s.slug, label: s.name }))),
    } as Record<FacetGroup, Option[]>;
  }, [products, draft, lookup, subcategories, stores]);

  /**
   * A group is not rendered when every option returns nothing, or when there
   * are fewer than two options with stock — a filter offering one choice is
   * not a filter.
   */
  const shown = groups.filter((g) => optionsFor[g].filter((o) => o.count > 0).length >= 2);

  const resultCount = useMemo(
    () => products.filter((p) => matches(p, draft, lookup)).length,
    [products, draft, lookup]
  );

  if (!open) return null;

  const selectedIn = (g: FacetGroup) =>
    g === "price"
      ? draft.price.length + (draft.min != null || draft.max != null ? 1 : 0)
      : draft[g as ListKey].length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" role="dialog" aria-label="Filter">
      <button type="button" aria-label="Close" className="flex-1" onClick={onClose} />

      <div className="flex h-[90dvh] flex-col rounded-t-[18px] bg-canvas">
        <div className="shrink-0 px-4 pb-2 pt-2.5">
          <span aria-hidden className="mx-auto block h-1 w-10 rounded-pill bg-ink/15" />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-body font-semibold text-ink">Filter</p>
            <button type="button" onClick={onClose} aria-label="Close" className="tap-44 px-2 text-[18px] text-muted">
              ×
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 border-t border-line">
          {/* Left rail — group names only. */}
          <div className="w-[36%] shrink-0 overflow-y-auto bg-surface-sunk">
            {shown.map((g) => {
              const n = selectedIn(g);
              const on = g === active;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActive(g)}
                  className={`relative flex w-full items-center gap-1.5 px-4 py-3.5 text-left text-body ${
                    on ? "bg-canvas font-semibold text-ink" : "font-medium text-muted"
                  }`}
                >
                  {on ? (
                    <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-persimmon" />
                  ) : null}
                  {GROUP_LABEL[g]}
                  {n > 0 ? (
                    <span className="ml-auto flex items-center gap-1 text-caption text-persimmon">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-persimmon" />
                      {n}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Right pane — the active group only. */}
          <div className="min-w-0 flex-1 overflow-y-auto">
            {active === "price" ? (
              <PriceGroup draft={draft} setDraft={setDraft} options={optionsFor.price} />
            ) : (
              <ul>
                {optionsFor[active].map((o) => {
                  const key = active as ListKey;
                  const on = draft[key].includes(o.value);
                  const dead = o.count === 0 && !on;
                  return (
                    <li key={o.value} className="border-b border-line last:border-0">
                      <button
                        type="button"
                        disabled={dead}
                        onClick={() => setDraft((d) => toggleValue(d, key, o.value))}
                        className={`flex h-12 w-full items-center gap-2 px-4 text-left ${
                          dead ? "opacity-35" : ""
                        }`}
                      >
                        <span
                          className={`min-w-0 flex-1 truncate text-body ${
                            on ? "font-bold text-ink" : "text-ink"
                          }`}
                        >
                          {o.label}
                        </span>
                        <span className="shrink-0 text-caption text-muted">{o.count}</span>
                        <span
                          aria-hidden
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border text-[11px] font-black ${
                            on
                              ? "border-persimmon bg-persimmon text-white"
                              : "border-ink/25 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-line px-4 py-3">
          <button
            type="button"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                for: [],
                occasion: [],
                price: [],
                type: [],
                store: [],
                min: null,
                max: null,
                tile: null,
              }))
            }
            className="shrink-0 text-body font-medium text-muted underline underline-offset-4"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="min-h-[46px] flex-1 rounded-pill bg-persimmon text-body font-semibold text-white"
          >
            Show {resultCount} {resultCount === 1 ? "gift" : "gifts"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Tiers first, then a min/max pair under a divider. */
function PriceGroup({
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
      <ul>
        {options.map((o) => {
          const on = draft.price.includes(o.value);
          const dead = o.count === 0 && !on;
          return (
            <li key={o.value} className="border-b border-line">
              <button
                type="button"
                disabled={dead}
                onClick={() => setDraft((d) => toggleValue(d, "price", o.value))}
                className={`flex h-12 w-full items-center gap-2 px-4 text-left ${dead ? "opacity-35" : ""}`}
              >
                <span className={`min-w-0 flex-1 truncate text-body ${on ? "font-bold text-ink" : "text-ink"}`}>
                  {o.label}
                </span>
                <span className="shrink-0 text-caption text-muted">{o.count}</span>
                <span
                  aria-hidden
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border text-[11px] font-black ${
                    on ? "border-persimmon bg-persimmon text-white" : "border-ink/25 text-transparent"
                  }`}
                >
                  ✓
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-2 px-4 py-4">
        <input
          inputMode="numeric"
          placeholder="Min"
          value={draft.min ?? ""}
          onChange={(e) =>
            setDraft((d) => ({ ...d, min: e.target.value === "" ? null : Number(e.target.value) }))
          }
          className="h-11 w-full min-w-0 rounded-card border border-line bg-surface px-3 text-body"
        />
        <span aria-hidden className="text-muted">
          —
        </span>
        <input
          inputMode="numeric"
          placeholder="Max"
          value={draft.max ?? ""}
          onChange={(e) =>
            setDraft((d) => ({ ...d, max: e.target.value === "" ? null : Number(e.target.value) }))
          }
          className="h-11 w-full min-w-0 rounded-card border border-line bg-surface px-3 text-body"
        />
      </div>
    </div>
  );
}
