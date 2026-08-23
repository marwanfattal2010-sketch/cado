import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useProduct, useRelatedProducts, useOftenTogether } from "../hooks/useProducts";
import { productImageUrl } from "../lib/images";
import { storePath } from "../lib/routes";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Skeleton } from "../components/Skeleton";
import { ProductCard } from "../components/ProductCard";
import { useToast, Chip, RibbonDivider } from "../components/ui";
import { HeartIcon, ChevronLeftIcon } from "../components/Icons";
import { useFavoriteIds, useToggleFavorite } from "../hooks/useFavorites";
import { recordRecentlyViewed } from "../hooks/useRecentlyViewed";
import { CUTOFF_LABEL, timeUntilCutoff } from "../lib/area";
import { formatMoney } from "../lib/money";

/** Four ready-made lines, then a way out of them. Anything longer is a
 *  writing exercise on a screen whose job is to get to Add to cart. */
const NOTE_SUGGESTIONS = ["Happy birthday!", "Congratulations!", "Thank you", "Get well soon"];

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
      <div className="scroll-row">
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

  // Feeds the home page's "Recently viewed" row. Device-local localStorage
  // only — no server write, nothing anyone else can see.
  useEffect(() => {
    if (id) recordRecentlyViewed(id);
  }, [id]);
  const { data: product, isLoading } = useProduct(id);
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const favoriteIds = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();

  const [imgIndex, setImgIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [wantsNote, setWantsNote] = useState(false);
  const [hidePrice, setHidePrice] = useState(false);
  const [adding, setAdding] = useState(false);
  const noteField = useRef<HTMLTextAreaElement>(null);

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
  /* Same rule as the card badge and the filter: the store offers same-day AND
     there is a positive stock count. An unknown null never earns the promise,
     which is why this is stricter than `inStock`. */
  const sameDayEligible =
    product.same_day === true && product.stock_quantity != null && product.stock_quantity > 0;

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
        /* Carried per item, so checkout never asks for either of these
           again — place_order copies this object straight onto the
           order_item. Deliberately NO `gift_wrap` key: the server adds
           gift_wrap_price when that flag is true, and CADO does not wrap. */
        customization: {
          message: wantsNote ? message.trim() || undefined : undefined,
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
          {/* Edge-to-edge on purpose — see .scroll-row-flush. The gallery is
              the photo, so the shared page gutter would read as a bug here. */}
          <div className="scroll-row scroll-row-flush md:rounded-card md:overflow-hidden">
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
            /*
             * Direction-explicit, and it has to be.
             * CADO runs in Arabic as well as English, and in RTL a plain
             * `left-3` / `right-3` pair stopped being opposite corners —
             * the two controls ended up on the same side, stacked, with one
             * hanging off the screen edge. Back follows the reading
             * direction (the corner you came from), the heart takes the
             * other. Written out per direction so neither can drift.
             */
            className="tap-44 absolute top-3 flex h-9 w-9 items-center justify-center rounded-pill bg-surface/80 text-ink backdrop-blur ltr:left-3 rtl:right-3"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>

          {/* No login gate: signed-out hearts persist locally (see useFavorites). */}
          <button
            onClick={() => toggleFavorite.mutate({ productId: product.id, isFavorite })}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            /* The opposite corner from Back, in both directions — see above. */
            className="tap-44 absolute top-3 flex h-9 w-9 items-center justify-center rounded-pill bg-surface/80 text-ink backdrop-blur ltr:right-3 rtl:left-3"
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
              to={storePath(product.partner)}
              className="inline-flex min-h-[44px] items-center text-store text-muted underline-offset-2 hover:underline"
            >
              {product.partner.name}
            </Link>
          ) : null}
          <h1 className="font-display text-h1">{product.title}</h1>
          <p className="mt-2 text-[22px] font-bold">{formatMoney(product.price)}</p>

          {/* ONE delivery line, in the flow of the text — not a pill.
              A tinted capsule here competed with the price directly above it
              and read as a promotion rather than a fact about delivery. */}
          {sameDayEligible ? (
            <p className={`mt-2 text-caption font-medium ${cutoff.passed ? "text-muted" : "text-today"}`}>
              {cutoff.passed ? cutoff.label : `Arrives today if you order before ${CUTOFF_LABEL}`}
            </p>
          ) : !inStock ? (
            <p className="mt-2 text-caption font-medium text-muted">Out of stock</p>
          ) : null}

          {inStock && product.stock_quantity != null && product.stock_quantity <= 3 ? (
            <p className="mt-1 text-caption font-medium text-alert">Only {product.stock_quantity} left</p>
          ) : null}

          {/* Two plain checkboxes. No card, no heading, no thumbnail — this
              is a pair of choices, and dressing it as a panel made it look
              like a step you had to complete before buying. */}
          <div className="mt-5 space-y-1">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-body">
              <input
                type="checkbox"
                checked={wantsNote}
                onChange={(e) => setWantsNote(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-[color:rgb(var(--primary))]"
              />
              Add a free handwritten note
            </label>

            {wantsNote ? (
              <div className="pb-1 pl-[26px]">
                <div className="flex flex-wrap gap-1.5">
                  {NOTE_SUGGESTIONS.map((s) => (
                    <Chip
                      key={s}
                      active={message === s}
                      onClick={() => setMessage(s)}
                      className="!h-8 !px-3 !text-caption"
                    >
                      {s}
                    </Chip>
                  ))}
                  {/* Not a filter — an escape hatch. Clears whatever canned
                      line is in the box and puts the cursor in it. */}
                  <Chip
                    active={message.length > 0 && !NOTE_SUGGESTIONS.includes(message)}
                    onClick={() => {
                      if (NOTE_SUGGESTIONS.includes(message)) setMessage("");
                      noteField.current?.focus();
                    }}
                    className="!h-8 !px-3 !text-caption"
                  >
                    Write your own
                  </Chip>
                </div>
                <textarea
                  ref={noteField}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Write your message…"
                  className="mt-2 w-full resize-none rounded-card border border-line bg-canvas px-3.5 py-2.5 text-body outline-none focus:border-ink/35"
                />
              </div>
            ) : null}

            <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-body">
              <input
                type="checkbox"
                checked={hidePrice}
                onChange={(e) => setHidePrice(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-[color:rgb(var(--primary))]"
              />
              Hide the price from them
            </label>
          </div>

          {/* Plain text, no heading. Two lines is what someone reads before
              deciding; the rest of the story is the photo and the store. */}
          {product.description ? (
            <p className="mt-5 line-clamp-2 text-body text-muted">{product.description}</p>
          ) : null}

          <div className="mt-5 divide-y divide-line border-y border-line">
            <details className="group py-3">
              <summary className="cursor-pointer list-none text-body font-medium">Delivery &amp; returns</summary>
              <p className="mt-2 text-body text-muted">
                Order before {CUTOFF_LABEL} for same-day delivery across Lebanon. If something isn't right,
                contact us with your order number and we'll sort it with the store.
              </p>
            </details>
            {product.partner ? (
              <details className="group py-3">
                <summary className="cursor-pointer list-none text-body font-medium">
                  About {product.partner.name}
                </summary>
                <p className="mt-2 text-body text-muted">
                  A verified CADO partner store.{" "}
                  <Link to={storePath(product.partner)} className="tap-44 font-medium text-ink underline">
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
          <span className="text-price shrink-0">{formatMoney(product.price)}</span>
          <button
            onClick={addToCart}
            disabled={adding || !inStock}
            className="inline-flex h-[52px] flex-1 items-center justify-center rounded-pill bg-primary text-body font-medium text-inverse transition-all duration-fast active:scale-[0.97] disabled:opacity-40"
          >
            {!inStock ? "Out of stock" : adding ? "Adding..." : "Add to gift"}
          </button>
        </div>
      </div>
    </div>
  );
}
