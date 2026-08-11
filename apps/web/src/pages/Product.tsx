import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useProduct, useRelatedProducts, useOftenTogether } from "../hooks/useProducts";
import { productImageUrl } from "../lib/images";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Skeleton } from "../components/Skeleton";
import { Img } from "../components/Img";
import { ProductCard } from "../components/ProductCard";
import { useToast, Chip, RibbonDivider } from "../components/ui";
import { HeartIcon, ChevronLeftIcon } from "../components/Icons";
import { useFavoriteIds, useToggleFavorite } from "../hooks/useFavorites";
import { timeUntilCutoff } from "../lib/area";

const NOTE_SUGGESTIONS = [
  "Happy birthday!",
  "Congratulations!",
  "Thinking of you",
  "Get well soon",
  "Thank you",
  "With love",
];

function Row({
  title,
  items,
}: {
  title: string;
  items?: Parameters<typeof ProductCard>[0][];
}) {
  if (!items?.length) return null;
  return (
    <section className="pt-7">
      <h2 className="mx-auto max-w-6xl px-4 pb-3 font-display text-h2">{title}</h2>
      <div className="scroll-row gap-3 px-4">
        {items.map((p) => (
          <div key={p.id} className="w-[44vw] shrink-0 sm:w-[190px]">
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function Product() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id);
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();

  const [imgIndex, setImgIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [noteFrom, setNoteFrom] = useState("");
  const [noteTo, setNoteTo] = useState("");
  const [wantsNote, setWantsNote] = useState(false);
  const [hidePrice, setHidePrice] = useState(false);
  const [adding, setAdding] = useState(false);

  const [cutoff, setCutoff] = useState(() => timeUntilCutoff());
  useEffect(() => {
    const t = setInterval(() => setCutoff(timeUntilCutoff()), 30_000);
    return () => clearInterval(t);
  }, []);

  const related = useRelatedProducts(product?.category_id, product?.id);
  const together = useOftenTogether(product?.category_id, product?.id);

  if (isLoading || !product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:grid md:grid-cols-2 md:gap-8">
        <Skeleton className="aspect-square w-full" />
        <div className="mt-4 md:mt-0">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-7 w-3/4" />
          <Skeleton className="mt-4 h-6 w-24" />
          <Skeleton className="mt-6 h-24 w-full" />
          <Skeleton className="mt-4 h-[52px] w-full rounded-pill" />
        </div>
      </div>
    );
  }

  const images = (product.product_images ?? [])
    .slice()
    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const isFavorite = favoriteIds.has(product.id);
  const inStock = product.stock_quantity == null || product.stock_quantity > 0;
  const arrivesToday = product.same_day === true && inStock;

  const addToCart = async () => {
    if (!session) {
      navigate("/login");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("cart_items").insert({
        profile_id: session.user.id,
        product_id: product.id,
        quantity: 1,
        customization: {
          message: wantsNote ? message.trim() || undefined : undefined,
          note_from: wantsNote ? noteFrom.trim() || undefined : undefined,
          note_to: wantsNote ? noteTo.trim() || undefined : undefined,
          hide_price: hidePrice || undefined,
        },
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast("Added to cart");
    } catch {
      toast("Couldn't add that — try again");
    } finally {
      setAdding(false);
    }
  };

  return (
    // Bottom padding clears the sticky bar so nothing is trapped underneath.
    <div className="pb-28">
      <div className="mx-auto max-w-6xl md:grid md:grid-cols-2 md:gap-8 md:px-4 md:pt-4">
        {/* Gallery */}
        <div className="relative">
          <div className="scroll-row md:rounded-card md:overflow-hidden">
            {images.length > 0 ? (
              images.map((img, i) => (
                <img
                  key={img.id ?? i}
                  src={productImageUrl(img.storage_path)}
                  alt={product.title}
                  className="aspect-square w-full shrink-0 snap-start object-cover"
                  onLoad={() => i === 0 && setImgIndex(0)}
                />
              ))
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-surface-sunk text-muted">
                No image
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="tap-44 absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-pill bg-surface/80 text-ink backdrop-blur"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          {/* No login gate: signed-out hearts persist locally (see useFavorites). */}
          <button
            onClick={() => toggleFavorite.mutate({ productId: product.id, isFavorite })}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            className="tap-44 absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-pill bg-surface/80 text-ink backdrop-blur"
          >
            <HeartIcon className="h-[18px] w-[18px]" filled={isFavorite} />
          </button>

          {images.length > 1 ? (
            <div className="mt-3 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-pill transition-all ${i === imgIndex ? "w-5 bg-ink" : "w-1.5 bg-line"}`}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Details */}
        <div className="px-4 pt-5 md:px-0 md:pt-0">
          {product.partner ? (
            /* Given real height rather than a .tap-44 overlay: an overlay
               centred on 15px of text would reach down over the title, so
               tapping the product name would open the store instead. */
            <Link
              to={`/store/${product.partner.id}`}
              className="inline-flex min-h-[44px] items-center text-store text-muted underline-offset-2 hover:underline"
            >
              {product.partner.name}
            </Link>
          ) : null}
          <h1 className="font-display text-h1">{product.title}</h1>
          <p className="mt-2 text-[22px] font-bold">${Number(product.price).toFixed(0)}</p>

          {arrivesToday && !cutoff.passed ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-pill bg-today-tint px-3 py-1.5 text-caption font-medium text-today">
              Arrives today if you order within {cutoff.label.replace(" left for same-day delivery", "")}
            </p>
          ) : arrivesToday ? (
            <p className="mt-3 inline-flex rounded-pill bg-surface-sunk px-3 py-1.5 text-caption font-medium text-muted">
              Order now for delivery tomorrow morning
            </p>
          ) : !inStock ? (
            <p className="mt-3 inline-flex rounded-pill bg-surface-sunk px-3 py-1.5 text-caption font-medium text-muted">
              Out of stock
            </p>
          ) : null}

          {inStock && product.stock_quantity != null && product.stock_quantity <= 3 ? (
            <p className="mt-2 text-caption font-medium text-alert">Only {product.stock_quantity} left</p>
          ) : null}

          {/* Gift options. Wrapping is standard and free, so it's stated, not
              offered as a choice the person has to make. */}
          <div className="mt-6 rounded-card bg-surface p-4 shadow-rest">
            <p className="font-display text-h2">Gift options</p>

            <p className="mt-3 flex items-center gap-2 text-body">
              <span className="text-today">✓</span> Gift wrap — free, on every order
            </p>

            {/* "Say something with it" used to be a banner on the homepage,
                a long way from anywhere you could act on it. It belongs
                here, on the control that actually adds the note. */}
            <label className="mt-3 flex min-h-[56px] cursor-pointer items-center gap-3 text-body">
              <input
                type="checkbox"
                checked={wantsNote}
                onChange={(e) => setWantsNote(e.target.checked)}
                className="h-4 w-4 accent-[color:rgb(var(--primary))]"
              />
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-card bg-surface-sunk">
                <Img src="/misc/handwritten-note.jpg" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">Say something with it</span>
                <span className="block text-caption text-muted">
                  Add a handwritten note — free, tucked inside the wrap.
                </span>
              </span>
            </label>

            {wantsNote ? (
              <div className="mt-3 border-l-2 border-line pl-3">
                <div className="flex flex-wrap gap-1.5">
                  {NOTE_SUGGESTIONS.map((s) => (
                    <Chip key={s} active={message === s} onClick={() => setMessage(s)} className="!h-8 !px-3 !text-caption">
                      {s}
                    </Chip>
                  ))}
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Or write your own..."
                  className="mt-2.5 w-full resize-none rounded-card border border-line bg-canvas px-3.5 py-2.5 text-body outline-none focus:border-ink/35"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    value={noteTo}
                    onChange={(e) => setNoteTo(e.target.value)}
                    placeholder="To"
                    className="rounded-card border border-line bg-canvas px-3.5 py-2.5 text-body outline-none focus:border-ink/35"
                  />
                  <input
                    value={noteFrom}
                    onChange={(e) => setNoteFrom(e.target.value)}
                    placeholder="From"
                    className="rounded-card border border-line bg-canvas px-3.5 py-2.5 text-body outline-none focus:border-ink/35"
                  />
                </div>
              </div>
            ) : null}

            <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-body">
              <input
                type="checkbox"
                checked={hidePrice}
                onChange={(e) => setHidePrice(e.target.checked)}
                className="h-4 w-4 accent-[color:rgb(var(--primary))]"
              />
              Hide the price from them
            </label>
          </div>

          {product.description ? (
            <div className="mt-6">
              <h2 className="font-display text-h2">About this gift</h2>
              <p className="mt-2 text-body text-muted">{product.description}</p>
            </div>
          ) : null}

          <div className="mt-5 divide-y divide-line border-y border-line">
            <details className="group py-3">
              <summary className="cursor-pointer list-none text-body font-medium">Delivery &amp; returns</summary>
              <p className="mt-2 text-body text-muted">
                Order before 4PM for same-day delivery across Lebanon. If something isn't right, contact us
                with your order number and we'll sort it with the store.
              </p>
            </details>
            {product.partner ? (
              <details className="group py-3">
                <summary className="cursor-pointer list-none text-body font-medium">
                  About {product.partner.name}
                </summary>
                <p className="mt-2 text-body text-muted">
                  A verified CADO partner store.{" "}
                  <Link to={`/store/${product.partner.id}`} className="tap-44 font-medium text-ink underline">
                    See everything they sell
                  </Link>
                </p>
              </details>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-8">
        <RibbonDivider />
      </div>

      {/* Never dead-end the page. */}
      <Row title="You might also like" items={related.data} />
      <Row title="Often sent together" items={together.data} />

      {/* Sticky buy bar. On mobile, a buy button that scrolls away costs
          conversion, so it stays put. */}
      <div className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <span className="text-price shrink-0">${Number(product.price).toFixed(0)}</span>
          <button
            onClick={addToCart}
            disabled={adding || !inStock}
            className="inline-flex h-[52px] flex-1 items-center justify-center rounded-pill bg-primary text-body font-medium text-inverse transition-all duration-fast active:scale-[0.97] disabled:opacity-40"
          >
            {!inStock ? "Out of stock" : adding ? "Adding..." : "Add to cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
