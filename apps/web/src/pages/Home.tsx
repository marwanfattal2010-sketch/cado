import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { TabBar } from "../components/shop/TabBar";
import { Pager } from "../components/shop/Pager";
import { TabPanel } from "../components/shop/TabPanel";
import { AllCategoriesSheet } from "../components/shop/AllCategoriesSheet";
import { useBrowseConfig } from "../hooks/useBrowseConfig";
import { usePager } from "../hooks/usePager";
import { Skeleton } from "../components/Skeleton";
import { ShopSearchBar, ShopSearchResults } from "../components/shop/ShopSearch";
import { CutoffBar } from "../components/CutoffBar";

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
  const [deepLinked, setDeepLinked] = useState(false);

  /**
   * URL <-> TAB. ONE effect in, ONE callback out — never two effects.
   *
   * This was two effects (URL drives pager, pager drives URL) and they raced.
   * Effects run in declaration order within a commit, so when a category
   * circle navigated to `/?tab=jewelry`, the first effect called `goTo(2)`
   * and the second ran straight afterwards still holding the OLD `index` of
   * 0, decided the URL disagreed with it, and wrote `?tab=all` back over it.
   * The address bar and the page then named two different categories.
   *
   * A `setState` inside the first effect cannot fix that: it does not change
   * the `index` the second effect already captured in the same pass. So the
   * pager-to-URL direction is not an effect any more. `usePager` calls this
   * synchronously at the moment a move is ordered, which is the only moment
   * anyone actually knows where we are going.
   */
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const writeTabToUrl = useCallback(
    (next: number) => {
      const tab = tabsRef.current[next];
      if (!tab) return;
      const current = paramsRef.current;
      if (current.get("tab") === tab.slug) return;
      const search = new URLSearchParams(current);
      search.set("tab", tab.slug);
      // `replace`, so a flick through nine tabs does not bury the page you
      // arrived from under nine history entries.
      setParams(search, { replace: true });
    },
    [setParams]
  );

  const { ref, index, goTo } = usePager(tabs.length, writeTabToUrl);

  /** URL -> pager. The only remaining effect in this relationship. */
  const urlTab = params.get("tab");
  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    if (tabs.length === 0) return;
    const target = tabs.findIndex((t) => t.slug === urlTab);
    if (target >= 0 && target !== indexRef.current) {
      goTo(target, deepLinked ? "smooth" : "auto");
    }
    if (!deepLinked) setDeepLinked(true);
  }, [urlTab, tabs, goTo, deepLinked]);


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


  return (
    /*
     * The shell reserves the bottom nav's height rather than letting the nav
     * float over the content. That is what lets the delivery strip dock in
     * real layout space directly above it — see CutoffBar — instead of being
     * a fixed bar with the page sliding underneath.
     */
    <div
      className="shop-shell bg-canvas text-ink"
      style={{ paddingBottom: "calc(58px + env(safe-area-inset-bottom))" }}
    >
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

      {/* 2.7 — the cutoff strip, on category tabs only.
          Mounted ONCE here rather than inside each panel: the bar is
          position-fixed, and three mounted panels would have stacked three
          identical bars on top of each other, each running its own timer. */}
      {!searching && tabs[index] && tabs[index].filter.category_slug ? <CutoffBar /> : null}

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
