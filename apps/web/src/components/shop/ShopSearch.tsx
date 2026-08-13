import { useRef } from "react";
import { Link } from "react-router-dom";
import { SearchIcon } from "../Icons";
import { Img } from "../Img";
import { ProductCard } from "../ProductCard";
import { ProductGridSkeleton } from "../Skeleton";
import { useSearchProducts } from "../../hooks/useProducts";
import { useSearchStores } from "../../hooks/useStores";

/**
 * The search bar from the old Home page, moved above the category tabs.
 *
 * Unchanged in look and behaviour. It is a real `<form role="search">`, not a
 * bare input: that is what makes the iOS keyboard's return key say "Search"
 * (type="search" + enterKeyHint only get the label; without a form to submit,
 * pressing it does nothing and the keyboard stays up). Submitting blurs the
 * field, which is what actually dismisses the keyboard and hands the screen
 * back.
 *
 * The search itself is live: `query` updates on every keystroke and the
 * results re-render as you type, so by the time return is pressed the answer
 * is already on screen. Submit puts the keyboard away, it is never a gate in
 * front of the results — hence preventDefault and no navigation.
 *
 * The magnifier sits after the input in DOM order so it lands at the right
 * edge while the placeholder still starts from the left.
 */
export function ShopSearchBar({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-2 pt-2.5">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          input.current?.blur();
        }}
        /* The input is 42px inside a 44px pill and does not reach the
           horizontal padding or the icon, so a tap on the pill's edge would
           otherwise land on nothing. This makes the whole 44px control the
           tap target, which is what it looks like. */
        onClick={() => input.current?.focus()}
        className="search-field flex h-11 flex-1 items-center gap-2.5 rounded-pill border border-line bg-surface px-4 shadow-rest transition-colors duration-fast"
      >
        <input
          ref={input}
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search gifts or stores"
          aria-label="Search gifts or stores"
          /* h-full, not the input's default 23px line box: the pill is 44px
             and the input has to BE the tap target, or the top and bottom
             10px of the bar look tappable and do nothing. */
          className="h-full w-full min-w-0 bg-transparent text-body text-ink outline-none placeholder:text-muted"
        />
        <SearchIcon className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden />
      </form>
      {/* A way out for someone who's stuck, not a gate. */}
      <Link
        to="/gift-finder"
        className="tap-44 shrink-0 whitespace-nowrap text-caption font-medium text-ink underline underline-offset-4"
      >
        Help me choose
      </Link>
    </div>
  );
}

/**
 * What the page shows while there is something in the search field.
 *
 * Same markup as it had on the old Home. It replaces the tab panels rather
 * than pushing them down, because a search result list under nine tabs of
 * browse sections is two answers to one question.
 */
export function ShopSearchResults({ query }: { query: string }) {
  const products = useSearchProducts(query);
  const stores = useSearchStores(query);

  return (
    <div className="mx-auto max-w-6xl overflow-y-auto px-4 pb-24 pt-6">
      {stores.data && stores.data.length > 0 ? (
        <>
          <h2 className="mb-3 font-display text-h2">Stores</h2>
          <div className="flex flex-col gap-3">
            {stores.data.map((s) => (
              <Link
                key={s.id}
                to={`/store/${s.id}`}
                className="flex items-center gap-4 rounded-card bg-surface p-3 shadow-rest"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-card bg-surface-sunk">
                  <Img src={s.cover_image_url} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.name}</p>
                  {s.description ? <p className="truncate text-store text-muted">{s.description}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <h2 className="mb-3 mt-7 font-display text-h2">Gifts</h2>
      {products.isLoading ? (
        <ProductGridSkeleton count={6} />
      ) : products.data && products.data.length > 0 ? (
        <div className="grid animate-fade-in grid-cols-2 gap-3 md:grid-cols-4">
          {products.data.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      ) : (
        <p className="text-body text-muted">
          Nothing matches “{query}” yet — try a category above, or{" "}
          <Link to="/gift-finder" className="font-medium text-ink underline underline-offset-4">
            let us help you choose
          </Link>
          .
        </p>
      )}
    </div>
  );
}
