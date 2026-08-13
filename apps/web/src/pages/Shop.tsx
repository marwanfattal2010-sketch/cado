import { useEffect, useState } from "react";
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

/**
 * /shop — the tabbed browse experience.
 *
 * This route sits OUTSIDE the shared Layout on purpose. The shell is
 * height-constrained (`100dvh`, `overflow: hidden`) so that each tab panel is
 * its own scroll container — that is what makes the header solid and gives
 * every tab a remembered scroll position. Inside Layout the page would be one
 * long window scroll and neither would work.
 *
 * `?tab=slug` deep-links a tab and is kept in step with swipes, so a link to
 * Perfumes opens on Perfumes and the back button walks tabs the way a shopper
 * expects. It is `replace`, not `push`, for swipes — a flick through six tabs
 * should not bury the page you arrived from under six history entries.
 */
export function Shop() {
  const { tabs, blocksFor, isLoading } = useBrowseConfig();
  const [params, setParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
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

  // Land on the requested tab once the config is in. Once only: after that
  // the pager owns the index and the URL follows it.
  useEffect(() => {
    if (deepLinked || tabs.length === 0) return;
    const slug = params.get("tab");
    const target = slug ? tabs.findIndex((t) => t.slug === slug) : 0;
    if (target > 0) goTo(target, "auto");
    setDeepLinked(true);
  }, [deepLinked, params, tabs, goTo]);

  useEffect(() => {
    const tab = tabs[index];
    if (!tab || !deepLinked) return;
    if (params.get("tab") === tab.slug) return;
    const next = new URLSearchParams(params);
    next.set("tab", tab.slug);
    setParams(next, { replace: true });
  }, [index, tabs, deepLinked, params, setParams]);

  return (
    <div className="shop-shell bg-canvas text-ink">
      <Header />

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
          <TabBar
            tabs={tabs}
            activeIndex={index}
            onSelect={(i) => goTo(i)}
            onOpenAll={() => setSheetOpen(true)}
          />
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
              />
            ))}
          </Pager>
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
