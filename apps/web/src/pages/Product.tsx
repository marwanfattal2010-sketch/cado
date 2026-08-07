import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useProduct } from "../hooks/useProducts";
import { primaryImage } from "../lib/images";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export function Product() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(id);
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [giftWrap, setGiftWrap] = useState(false);
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  if (isLoading || !product) {
    return <div className="mx-auto max-w-6xl px-6 py-24 text-center text-ink/40">Loading...</div>;
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
        customization: { gift_wrap: giftWrap, message: message || undefined },
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
          <textarea
            className="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm outline-none focus:border-ink/40"
            placeholder="Add a personal message (optional)"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {product.gift_wrap_available ? (
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} />
              Add gift wrap (+{product.currency} {product.gift_wrap_price.toFixed(2)})
            </label>
          ) : null}

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
