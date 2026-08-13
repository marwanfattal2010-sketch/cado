import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { TabBar } from "../components/shop/TabBar";
import { Pager } from "../components/shop/Pager";
import { TabPanel } from "../components/shop/TabPanel";
import { AllCategoriesSheet } from "../components/shop/AllCategoriesSheet";
import { useBrowseConfig } from "../hooks/useBrowseConfig";
import { usePagerSync } from "../hooks/usePagerSync";
import { Skeleton } from "../components/Skeleton";
import { ShopSearchBar, ShopSearchResults } from "../components/shop/ShopSearch";

/**
 * "/" — the home page: search, the category tabs, and a landing page per tab.
 *
 * This replaced the old cream Home page with the serif hero. It was built and
 * shipped first at /shop so the two could be compared side by side; /shop is
 * now a redirect here.
 *
 * The route sits OUTSIDE the shared Layout on purpose. The shell is
 * height-constrained (`100dvh`, `overflow: hidden`) so that each tab panel is
 * its own scroll container — that is what makes the header and the search bar
 * solid without a single `position: sticky`, and what gives every tab a
 * remembered scroll position. Inside Layout the page would be one long window
 * scroll and none of that would work; Layout also wraps its pages in a
 * transform-based transition, which would make it the containing block for
 * the fixed bottom nav and the sheet backdrop.
 *
 * `?tab=slug` deep-links a tab and is kept in step with swipes, so a link to
 * Perfumes opens on Perfumes and the back button walks tabs the way a shopper
 * expects. It is `replace`, not `push`, for swipes — a flick through nine tabs
 * should not bury the page you arrived from under nine history entries.
 */
export function Home() {
  const { tabs, blocksFor, hrefForCategory, isLoading } = useBrowseConfig();
  const [params, setParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const { ref, index, goTo } = usePagerSync(tabs.length);
  const [deepLinked, setDeepLinked] = useState(false);

  /**
   * Which panels have had their contents mounted. Grows to cover the active
   * panel and its neighbours, and never shrinks.
   *
   * The never-shrinking part is the whole point. Unmounting a panel you
   * swiped away from empties its scroll container, so coming back put you at
   * the top again — the one behaviour the tabs are supposed to have is
   * remembering where you were. Keeping a visited panel mounted preserves
   * that for free, and the cost is bounded: at most nine panels, and only the
   * ones actually opened.
   */
  const [everMounted, setEverMounted] = useState<Set<number>>(() => new Set([0, 1]));
  useEffect(() => {
    setEverMounted((prev) => {
      const next = new Set(prev);
      for (const i of [index - 1, index, index + 1]) {
        if (i >= 0 && i < tabs.length) next.add(i);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [index, tabs.length]);

  /**
   * `?tab=` drives the pager, not just on arrival but whenever it changes.
   *
   * It used to run once and then hand ownership to the pager, which quietly
   * broke tapping a category circle: the circle navigates to `/?tab=fashion`,
   * but we are already on "/", so nothing remounted, the one-shot effect
   * never fired, and the sync effect below immediately rewrote the URL back
   * to the tab still on screen. The tap changed the address bar for a frame
   * and nothing else.
   *
   * No loop: this only moves the pager when the URL names a different tab,
   * and the effect below only writes the URL when it does not already say
   * what the pager is showing.
   */
  /**
   * Which tab the URL is currently steering us to, while the pager catches
   * up. Null the rest of the time, which is when the pager is in charge.
   *
   * Both effects run in the same pass, and `setIndex` inside the first one
   * does not update `index` for the second — so without this the sync effect
   * below saw the new URL next to the OLD index and "corrected" the URL back.
   * The tab moved and the address bar lied about it.
   */
  const drivingTo = useRef<number | null>(null);
  const urlTab = params.get("tab");
  useEffect(() => {
    if (tabs.length === 0) return;
    const target = tabs.findIndex((t) => t.slug === urlTab);
    if (target >= 0 && target !== index) {
      drivingTo.current = target;
      goTo(target, deepLinked ? "smooth" : "auto");
    }
    if (!deepLinked) setDeepLinked(true);
    // `index` is deliberately not a dependency: this reacts to the URL, and
    // reacting to its own result is the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab, tabs, goTo, deepLinked]);

  /**
   * The URL follows the pager — and ONLY when the pager moves.
   *
   * `params` is read through a ref rather than being a dependency, which is
   * the whole fix. With it in the deps this effect also ran the instant a
   * link changed the URL, at which point `index` was still the old tab, so it
   * helpfully "corrected" `?tab=fashion` back to `?tab=all` a frame before
   * the pager arrived at Fashion. The tab moved and the address bar lied.
   */
  const paramsRef = useRef(params);
  paramsRef.current = params;
  useEffect(() => {
    const tab = tabs[index];
    if (!tab || !deepLinked) return;
    // A URL-driven move is still in flight; it owns the address bar until the
    // pager arrives, and writing here would undo it.
    if (drivingTo.current !== null) {
      if (drivingTo.current !== index) return;
      drivingTo.current = null;
    }
    const current = paramsRef.current;
    if (current.get("tab") === tab.slug) return;
    const next = new URLSearchParams(current);
    next.set("tab", tab.slug);
    setParams(next, { replace: true });
  }, [index, tabs, deepLinked, setParams]);

  return (
    <div className="shop-shell bg-canvas text-ink">
      <Header />

      {/*
        2 — SEARCH, directly under the header and above the tabs.

        It does not need `position: sticky`. The shell is height-constrained
        and only the panels scroll, so the header, the search bar and the tab
        bar are all permanently in place — which is what the old page's
        sticky block was trying to achieve by hand, and could only manage by
        chasing the header's measured height through a transition.
      */}
      <div className="shrink-0">
        <ShopSearchBar query={query} onQueryChange={setQuery} />
      </div>

      {isLoading ? (
        <div className="flex-1 px-[var(--page-x)] pt-4">
          <Skeleton className="h-11 w-full rounded-card" />
          <Skeleton className="mt-4 aspect-[2/1] w-full rounded-card" />
        </div>
      ) : tabs.length === 0 ? (
        <div className="flex-1 px-[var(--page-x)] py-16 text-center text-body text-muted">
          Shop is not set up yet.
        </div>
      ) : (
        <>
          {/* 3 — the tabs stay put while searching. They are how you get out
              of a search, so hiding them would leave the field as the only
              thing on screen with no way back to browsing. */}
          <TabBar
            tabs={tabs}
            activeIndex={index}
            onSelect={(i) => {
              setQuery("");
              goTo(i);
            }}
            onOpenAll={() => setSheetOpen(true)}
          />
          {searching ? (
            <ShopSearchResults query={query} />
          ) : (
            <Pager scrollRef={ref}>
              {tabs.map((tab, i) => (
                <TabPanel
                  key={tab.id}
                  tab={tab}
                  blocks={blocksFor.get(tab.id) ?? []}
                  active={i === index}
                  // Neighbours mount ahead of time so a swipe lands on a
                  // painted page rather than a spinner; a tab never visited is
                  // still just a spacer.
                  mounted={everMounted.has(i)}
                  // The landing tab — the one with no category filter — is
                  // the only one that carries the sections inherited from the
                  // old Home page.
                  primary={!tab.filter.category_slug}
                  hrefForCategory={hrefForCategory}
                />
              ))}
            </Pager>
          )}
        </>
      )}

      <BottomNav />

      <AllCategoriesSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        tabs={tabs}
        blocksFor={blocksFor}
        activeIndex={index}
        onSelectTab={(i) => goTo(i, "auto")}
      />
    </div>
  );
}
