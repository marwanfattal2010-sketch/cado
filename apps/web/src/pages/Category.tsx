import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCategoryCounts, useProductsByCategory } from "../hooks/useProducts";
import { useStoresByCategory } from "../hooks/useStores";
import { useCategories } from "../hooks/useCategories";
import { CategoryChips, tidyCategory } from "../components/CategoryChips";
import { ProductCard } from "../components/ProductCard";
import { StoreCard, StoreCardSkeleton } from "../components/StoreCard";
import { ProductGridSkeleton, ProductRowSkeleton, Skeleton } from "../components/Skeleton";
import { Button, Chip, RemovableChip, RibbonEmpty, Sheet } from "../components/ui";
import { AUDIENCES, BUDGETS, budgetBySlug, inBudgetRange } from "../lib/filters";

type Sort = "popular" | "newest" | "price_asc" | "price_desc";

const SORTS: { value: Sort; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

/** Below these a section is hidden rather than shown half-empty. */
const MIN_SECTION_ITEMS = 4;
const MIN_SECTION_STORES = 2;
const PAGE = 12;

type Filters = {
  audience: string | null;
  budget: string | null;
  storeId: string | null;
  subcategory: string | null;
  sameDayOnly: boolean;
};

const NO_FILTERS: Filters = {
  audience: null,
  budget: null,
  storeId: null,
  subcategory: null,
  sameDayOnly: false,
};

type Row = NonNullable<ReturnType<typeof useProductsByCategory>["data"]>[number];

export function Category() {
  const { slug } = useParams<{ slug: string }>();

  /** Applied filters — what the grid is actually showing. */
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  /** Draft filters — what the sheet shows before Apply is tapped. */
  const [draft, setDraft] = useState<Filters>(NO_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sort, setSort] = useState<Sort>("popular");
  const [shown, setShown] = useState(PAGE);

  const categories = useCategories();
  const categoryCounts = useCategoryCounts();
  const stores = useStoresByCategory(slug);
  const products = useProductsByCategory(slug);

  const category = categories.data?.find((c) => c.slug === slug);
  const categoryName = category ? tidyCategory(category.name) : (slug?.replace(/-/g, " ") ?? "");

  const rows = useMemo(() => (products.data ?? []) as Row[], [products.data]);

  // Reset when the category changes — carrying "Lumière Fine Jewelry" over
  // into Toys is how a page ends up mysteriously empty.
  useEffect(() => {
    setFilters(NO_FILTERS);
    setDraft(NO_FILTERS);
    setSort("popular");
  }, [slug]);

  /** One matcher, used for the grid and for every count in the sheet. */
  const matches = (p: Row, f: Filters) => {
    if (f.audience && !(p.recipient_tags as string[] | null)?.includes(f.audience)) return false;
    if (f.budget && !inBudgetRange(Number(p.price), budgetBySlug(f.budget))) return false;
    if (f.storeId && p.partner?.id !== f.storeId) return false;
    if (f.subcategory && p.subcategory?.slug !== f.subcategory) return false;
    // Same rule as the card badge: the store offers same-day AND there is
    // stock. An unknown stock count never earns the promise.
    if (f.sameDayOnly && !(p.same_day === true && (p.stock_quantity ?? 0) > 0)) return false;
    return true;
  };

  const visible = useMemo(() => {
    const sorted = rows.filter((p) => matches(p, filters));
    switch (sort) {
      case "price_asc":
        sorted.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price_desc":
        sorted.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "newest":
        sorted.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
        break;
      case "popular":
        // Editorially flagged first, newest after. There is no sales or view
        // data the storefront can read, so this is a curated order — and
        // nothing on the page claims otherwise. No ranks, no "#1 seller".
        sorted.sort(
          (a, b) =>
            Number(!!b.is_trending) - Number(!!a.is_trending) ||
            String(b.created_at).localeCompare(String(a.created_at))
        );
        break;
    }
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filters, sort]);

  /**
   * Counts inside the sheet are computed with the *other* draft filters still
   * applied, so each number is what you'd actually get by tapping it. A count
   * that ignores your current selection sends people into empty screens.
   */
  const countWith = (patch: Partial<Filters>) =>
    rows.filter((p) => matches(p, { ...draft, ...patch })).length;

  const subcategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of rows) if (p.subcategory?.slug) map.set(p.subcategory.slug, p.subcategory.name);
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [rows]);

  const activeChips = useMemo(() => {
    const out: { key: keyof Filters; label: string }[] = [];
    if (filters.audience)
      out.push({ key: "audience", label: AUDIENCES.find((a) => a.value === filters.audience)?.label ?? "" });
    if (filters.budget) out.push({ key: "budget", label: budgetBySlug(filters.budget)?.label ?? "" });
    if (filters.storeId)
      out.push({ key: "storeId", label: stores.data?.find((s) => s.id === filters.storeId)?.name ?? "Store" });
    if (filters.subcategory)
      out.push({
        key: "subcategory",
        label: subcategories.find((s) => s.value === filters.subcategory)?.label ?? "",
      });
    if (filters.sameDayOnly) out.push({ key: "sameDayOnly", label: "Arrives today" });
    return out;
  }, [filters, stores.data, subcategories]);

  const clearOne = (key: keyof Filters) => {
    const next = { ...filters, [key]: key === "sameDayOnly" ? false : null } as Filters;
    setFilters(next);
    setDraft(next);
  };

  // Reveal more as you reach the bottom rather than making anyone hunt for a
  // "load more" button with a thumb.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => setShown(PAGE), [slug, filters, sort]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setShown((n) => (n >= visible.length ? n : n + PAGE));
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible.length]);

  /** A sibling category that actually has gifts in it. Pointing a thin shelf
   *  at another empty shelf is worse than not pointing anywhere. */
  const relatedCategory = useMemo(() => {
    const counts = categoryCounts.data;
    if (!counts || !categories.data) return null;
    return (
      categories.data
        .filter((c) => c.slug !== slug && (counts.get(c.slug) ?? 0) >= MIN_SECTION_ITEMS)
        .sort((a, b) => (counts.get(b.slug) ?? 0) - (counts.get(a.slug) ?? 0))[0] ?? null
    );
  }, [categoryCounts.data, categories.data, slug]);

  const showHighlights = rows.length >= MIN_SECTION_ITEMS;
  const showStores = (stores.data?.length ?? 0) >= MIN_SECTION_STORES;

  /** Newest-first, and labelled as such. There is no order or view data the
   *  storefront can read under RLS, so calling this "Most popular" would be
   *  inventing a bestseller rank. */
  const highlights = useMemo(
    () => rows.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 10),
    [rows]
  );

  const draftCount = rows.filter((p) => matches(p, draft)).length;

  return (
    <div className="pb-12">
      {/* The category rail stays pinned on every category page, so hopping
          from Toys to Perfumes is one tap and never a trip home. */}
      <div className="sticky top-[var(--header-h)] z-[15] border-b border-line bg-canvas/95 py-2.5 backdrop-blur">
        <CategoryChips activeSlug={slug} />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-5">
        <nav className="flex items-center gap-1.5 text-caption text-muted">
          <Link to="/" className="tap-44 hover:text-ink">
            Home
          </Link>
          <span aria-hidden>›</span>
          <span>{categoryName}</span>
        </nav>

        <h1 className="mt-2 font-display text-h1">{categoryName}</h1>
        {products.isLoading ? (
          <Skeleton className="mt-1.5 h-3 w-20" />
        ) : (
          <p className="mt-1 text-caption text-muted">
            {visible.length} {visible.length === 1 ? "gift" : "gifts"}
          </p>
        )}

        {activeChips.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeChips.map((c) => (
              <RemovableChip key={c.key} onRemove={() => clearOne(c.key)}>
                {c.label}
              </RemovableChip>
            ))}
          </div>
        ) : null}
      </div>

      {/* 2 — HIGHLIGHTS. Only when there is enough here to fill a row. */}
      {products.isLoading ? (
        <section className="pt-6">
          <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">New in {categoryName}</h2>
          <ProductRowSkeleton />
        </section>
      ) : showHighlights ? (
        <section className="pt-6">
          <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">New in {categoryName}</h2>
          <div className="scroll-row gap-3 px-4">
            {highlights.map((p) => (
              <div key={p.id} className="w-[42vw] shrink-0 sm:w-[190px]">
                <ProductCard {...(p as Parameters<typeof ProductCard>[0])} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 3 — STORES. Tapping one filters the grid below rather than
          navigating away, so the comparison stays on one screen. */}
      {stores.isLoading ? (
        <section className="pt-7">
          <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">Stores for {categoryName}</h2>
          <div className="scroll-row gap-3 px-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <StoreCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ) : showStores ? (
        <section className="pt-7">
          <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">Stores for {categoryName}</h2>
          <div className="scroll-row gap-3 px-4">
            {stores.data?.map((store) => (
              <button
                key={store.id}
                onClick={() => {
                  const next = { ...filters, storeId: filters.storeId === store.id ? null : store.id };
                  setFilters(next);
                  setDraft(next);
                  document
                    .getElementById("category-grid")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                aria-pressed={filters.storeId === store.id}
                className={`shrink-0 rounded-card ${
                  filters.storeId === store.id ? "ring-2 ring-primary ring-offset-2 ring-offset-canvas" : ""
                }`}
              >
                {/* Non-linking variant on purpose: here the card filters the
                    grid, and an <a> inside a <button> is invalid markup that
                    swallows the click in some browsers. */}
                <StoreCard store={store} interactive={false} />
              </button>
            ))}
          </div>
          <p className="mx-auto max-w-6xl px-4 pt-2 text-caption text-muted">
            Tap a store to filter the gifts below.
          </p>
        </section>
      ) : null}

      {/* 4 — SORT + FILTER, then the grid. Sort is one dropdown, filters are
          one sheet. Mixing them into a single chip row is what made the old
          bar impossible to read at a glance. */}
      <div id="category-grid" className="mx-auto max-w-6xl px-4 pt-7">
        <div className="flex items-center gap-2">
          <label className="relative flex h-11 flex-1 items-center rounded-pill border border-line bg-surface">
            <span className="sr-only">Sort gifts</span>
            {/* The select fills the whole pill rather than sitting as a 17px
                line of text inside it — otherwise the actual tap target is
                the text, not the control. */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-full w-full appearance-none rounded-pill bg-transparent pl-4 pr-9 text-caption font-medium text-ink outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  Sort: {s.label}
                </option>
              ))}
            </select>
            <span aria-hidden className="pointer-events-none absolute right-4 text-[10px] text-muted">
              ▾
            </span>
          </label>

          <button
            onClick={() => {
              setDraft(filters);
              setSheetOpen(true);
            }}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-pill border border-line bg-surface px-5 text-caption font-medium text-ink transition-all duration-press ease-out active:scale-[0.97]"
          >
            Filters
            {activeChips.length ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1.5 text-[11px] font-semibold text-inverse">
                {activeChips.length}
              </span>
            ) : null}
          </button>
        </div>

        <div className="pt-5">
          {products.isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : visible.length > 0 ? (
            <>
              <div className="grid animate-fade-in grid-cols-2 gap-3 md:grid-cols-4">
                {visible.slice(0, shown).map((p) => (
                  <ProductCard key={p.id} {...(p as Parameters<typeof ProductCard>[0])} />
                ))}
              </div>
              <div ref={sentinel} className="h-8" />
              {/* Thin, but real. Never padded out with repeats. */}
              {visible.length < MIN_SECTION_ITEMS && activeChips.length === 0 ? (
                <p className="pt-1 text-caption text-muted">
                  More gifts arriving soon.
                  {relatedCategory ? (
                    <>
                      {" "}
                      In the meantime, try{" "}
                      {/* .tap-44 because this is a short word inside a
                          sentence — growing the link itself would break the
                          line. Nothing tappable sits next to it, so the
                          invisible overlay can't steal a neighbour's tap. */}
                      <Link
                        to={`/category/${relatedCategory.slug}`}
                        className="tap-44 font-medium text-ink underline underline-offset-4"
                      >
                        {tidyCategory(relatedCategory.name)}
                      </Link>
                      .
                    </>
                  ) : null}
                </p>
              ) : null}
            </>
          ) : (
            <div className="py-14 text-center">
              <RibbonEmpty className="mx-auto h-14 w-14" />
              <p className="mt-3 font-display text-h2">Nothing here yet</p>
              <p className="mx-auto mt-2 max-w-xs text-body text-muted">
                {activeChips.length
                  ? "No gifts match these filters. Try widening them."
                  : `We're still adding gifts to ${categoryName}.`}
              </p>
              {activeChips.length ? (
                <Button
                  className="mt-5"
                  onClick={() => {
                    setFilters(NO_FILTERS);
                    setDraft(NO_FILTERS);
                  }}
                >
                  Clear filters
                </Button>
              ) : relatedCategory ? (
                <Link
                  to={`/category/${relatedCategory.slug}`}
                  className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-primary px-7 text-body font-medium text-inverse"
                >
                  Browse {tidyCategory(relatedCategory.name)}
                </Link>
              ) : (
                <Link
                  to="/browse"
                  className="mt-5 inline-flex h-[52px] items-center rounded-pill bg-primary px-7 text-body font-medium text-inverse"
                >
                  Browse all categories
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
        {/* "For" first and unmissable. Fashion and Shoes lean on it hardest,
            but it stays inside the sheet rather than becoming a top tab —
            CADO is gift-first, so who it's for is a filter, not the frame. */}
        <FilterGroup label="For">
          {AUDIENCES.map((a) => {
            const n = countWith({ audience: a.value });
            if (n === 0 && draft.audience !== a.value) return null;
            return (
              <Chip
                key={a.value}
                active={draft.audience === a.value}
                onClick={() => setDraft({ ...draft, audience: draft.audience === a.value ? null : a.value })}
                className="!h-10 !px-4 !text-caption"
              >
                {a.label}
                <span className="opacity-60">{n}</span>
              </Chip>
            );
          })}
        </FilterGroup>

        <FilterGroup label="Budget">
          {BUDGETS.map((b) => {
            const n = countWith({ budget: b.slug });
            if (n === 0 && draft.budget !== b.slug) return null;
            return (
              <Chip
                key={b.slug}
                active={draft.budget === b.slug}
                onClick={() => setDraft({ ...draft, budget: draft.budget === b.slug ? null : b.slug })}
                className="!h-10 !px-4 !text-caption"
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
                  onClick={() =>
                    setDraft({ ...draft, subcategory: draft.subcategory === s.value ? null : s.value })
                  }
                  className="!h-10 !px-4 !text-caption"
                >
                  {s.label}
                  <span className="opacity-60">{n}</span>
                </Chip>
              );
            })}
          </FilterGroup>
        ) : null}

        {(stores.data?.length ?? 0) > 1 ? (
          <FilterGroup label="Store">
            {stores.data?.map((s) => {
              const n = countWith({ storeId: s.id });
              if (n === 0 && draft.storeId !== s.id) return null;
              return (
                <Chip
                  key={s.id}
                  active={draft.storeId === s.id}
                  onClick={() => setDraft({ ...draft, storeId: draft.storeId === s.id ? null : s.id })}
                  className="!h-10 !px-4 !text-caption"
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
            onClick={() => setDraft({ ...draft, sameDayOnly: !draft.sameDayOnly })}
            /* Explicit pixels: this project's spacing scale maps 8 to 64px
               and 6 to 32px, so h-8/h-6 would build a switch twice the
               intended size. */
            className={`relative h-[32px] w-[52px] shrink-0 rounded-pill transition-colors ${
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
              setFilters(draft);
              setSheetOpen(false);
            }}
          >
            Show {draftCount}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-1">
      <p className="text-eyebrow uppercase text-muted">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
