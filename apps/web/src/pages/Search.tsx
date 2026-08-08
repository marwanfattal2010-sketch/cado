import { useState } from "react";
import { Link } from "react-router-dom";
import { useSearchProducts } from "../hooks/useProducts";
import { useSearchStores } from "../hooks/useStores";
import { ProductCard } from "../components/ProductCard";
import { ProductGridSkeleton } from "../components/Skeleton";
import { SearchIcon } from "../components/Icons";

type Tab = "stores" | "items";

export function Search() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("stores");

  const stores = useSearchStores(query);
  const products = useSearchProducts(query);
  const searching = query.trim().length > 0;

  return (
    <div className="mx-auto max-w-4xl px-5 py-6">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/30" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stores or gifts..."
          className="w-full rounded-full border border-ink/12 bg-white py-3.5 pl-12 pr-5 text-[15px] outline-none transition focus:border-ink/35"
        />
      </div>

      <div className="mt-5 flex gap-2">
        {(["stores", "items"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition ${
              tab === t ? "bg-ink text-cream" : "bg-ink/5 text-ink/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {!searching ? (
        <p className="mt-12 text-center text-sm text-ink/40">
          Start typing to find a store or a gift.
        </p>
      ) : tab === "stores" ? (
        <div className="mt-6 flex flex-col gap-3">
          {stores.data?.map((s) => (
            <Link
              key={s.id}
              to={`/store/${s.id}`}
              className="flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-ink/5 transition hover:ring-ink/20"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink/5">
                {s.cover_image_url ? (
                  <img src={s.cover_image_url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{s.name}</p>
                {s.description ? (
                  <p className="truncate text-sm text-ink/50">{s.description}</p>
                ) : null}
              </div>
            </Link>
          ))}
          {stores.data?.length === 0 ? (
            <p className="mt-8 text-center text-sm text-ink/40">No stores match "{query}".</p>
          ) : null}
        </div>
      ) : products.isLoading ? (
        <div className="mt-6">
          <ProductGridSkeleton count={6} />
        </div>
      ) : (
        <div className="mt-6 grid animate-fade-in grid-cols-2 gap-5 sm:grid-cols-3">
          {products.data?.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
          {products.data?.length === 0 ? (
            <p className="col-span-full mt-8 text-center text-sm text-ink/40">
              No gifts match "{query}".
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
