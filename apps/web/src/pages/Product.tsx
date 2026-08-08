import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useProduct } from "../hooks/useProducts";
import { primaryImage } from "../lib/images";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Skeleton } from "../components/Skeleton";

const NOTE_SUGGESTIONS = [
  "Happy birthday!",
  "Congratulations!",
  "Thinking of you",
  "Get well soon",
  "Thank you",
  "With love",
];

export function Product() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id);
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [noteFrom, setNoteFrom] = useState("");
  const [noteTo, setNoteTo] = useState("");
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  if (isLoading || !product) {
    return (
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-3xl" />
        <div>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-8 w-3/4" />
          <Skeleton className="mt-4 h-5 w-24" />
          <Skeleton className="mt-6 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
          <Skeleton className="mt-8 h-20 w-full rounded-xl" />
          <Skeleton className="mt-4 h-12 w-full rounded-full" />
        </div>
      </div>
    );
  }

  const uri = primaryImage(product.product_images);

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
          message: message.trim() || undefined,
          note_from: noteFrom.trim() || undefined,
          note_to: noteTo.trim() || undefined,
        },
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 md:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-3xl bg-ink/5">
        {uri ? <img src={uri} alt={product.title} className="h-full w-full object-cover" /> : null}
      </div>

      <div>
        {product.partner ? <p className="text-sm text-ink/50">{product.partner.name}</p> : null}
        <h1 className="mt-1 font-display text-4xl">{product.title}</h1>
        <p className="mt-3 text-xl">
          {product.currency} {product.price.toFixed(2)}
        </p>
        {product.description ? <p className="mt-6 text-ink/70">{product.description}</p> : null}

        <div className="mt-8 space-y-4">
          {/* Every order is gift-wrapped as standard, so there's nothing to
              opt into — the note is the only thing left to personalise. */}
          <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/8">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-medium">Add a note</p>
              <span className="text-xs text-ink/40">Optional · free</span>
            </div>
            <p className="mt-1 text-xs text-ink/50">We'll write it on a card and tuck it in with the gift.</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {NOTE_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMessage(s)}
                  className={`rounded-full px-3 py-1.5 text-xs transition-all duration-150 active:scale-95 ${
                    message === s ? "bg-ink text-cream" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <textarea
              className="mt-3 w-full resize-none rounded-xl border border-ink/12 bg-cream/40 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink/35"
              placeholder="Or write your own..."
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                className="rounded-xl border border-ink/12 bg-cream/40 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink/35"
                placeholder="To (optional)"
                value={noteTo}
                onChange={(e) => setNoteTo(e.target.value)}
              />
              <input
                className="rounded-xl border border-ink/12 bg-cream/40 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-ink/35"
                placeholder="From (optional)"
                value={noteFrom}
                onChange={(e) => setNoteFrom(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={addToCart}
            disabled={adding || product.stock_quantity <= 0}
            className={`w-full rounded-full py-3 text-sm tracking-wide transition-colors disabled:opacity-40 ${
              justAdded ? "bg-emerald-600 text-white" : "bg-ink text-cream"
            }`}
          >
            {product.stock_quantity <= 0
              ? "Out of stock"
              : adding
                ? "Adding..."
                : justAdded
                  ? "Added ✓"
                  : "Add to cart"}
          </button>
          {justAdded ? (
            <Link to="/cart" className="block text-center text-sm text-ink/50 underline">
              View cart
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
