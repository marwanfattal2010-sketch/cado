import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/**
 * "Rate this order" — shown on a delivered order (V5 §3).
 *
 * A rating belongs to a SHOP's part of an order, which is what a customer
 * means: one order can come from two shops and they can deserve different
 * stars. `submit_review()` records it and enforces the rules in the database —
 * your own order, delivered, once only — so the button being hidden is a
 * courtesy, not the protection.
 *
 * Once rated, the stars stay on screen read-only. There is no edit: a review
 * someone can quietly rewrite is not evidence of anything.
 */

function Star({ filled, ...rest }: { filled: boolean } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden {...rest}
      fill={filled ? "var(--persimmon, #F94E33)" : "none"}
      stroke={filled ? "var(--persimmon, #F94E33)" : "currentColor"} strokeWidth="1.6"
      strokeLinejoin="round">
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  );
}

export function RateOrder({ subOrderId, storeName }: { subOrderId: string; storeName: string }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Has this shop's part already been rated? The customer can read their own
  // reviews, so this is a real check rather than local state.
  const existing = useQuery({
    queryKey: ["review", subOrderId],
    queryFn: async () => {
      const { data: items } = await supabase
        .from("order_items")
        .select("id")
        .eq("sub_order_id", subOrderId)
        .order("id")
        .limit(1);
      const itemId = items?.[0]?.id;
      if (!itemId) return null;
      const { data } = await supabase
        .from("reviews")
        .select("rating, text")
        .eq("order_item_id", itemId)
        .maybeSingle();
      return data ?? null;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const { error: rpcError } = await supabase.rpc("submit_review", {
        p_sub_order_id: subOrderId,
        p_rating: rating,
        p_comment: comment.trim() || undefined,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ["review", subOrderId] });
    },
    onError: (e: { message?: string }) => setError(e.message ?? "That didn't save."),
  });

  if (existing.isLoading) return null;

  if (existing.data) {
    return (
      <div className="mt-3 border-t border-line pt-3" onClick={(e) => e.stopPropagation()}>
        <p className="mb-1 text-caption text-muted">You rated {storeName}</p>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} filled={n <= existing.data!.rating} />
          ))}
        </div>
        {existing.data.text ? (
          <p className="mt-1 text-caption italic text-muted">“{existing.data.text}”</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-line pt-3" onClick={(e) => e.stopPropagation()}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-body font-semibold text-persimmon"
        >
          Rate this order
        </button>
      ) : (
        <>
          <p className="mb-1.5 text-caption text-muted">How was {storeName}?</p>
          <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className="p-0.5"
              >
                <Star filled={n <= (hover || rating)} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Anything you want to say? (optional)"
            className="mt-2 w-full rounded-card border border-line bg-canvas p-2 text-body outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={rating === 0 || submit.isPending}
              onClick={() => submit.mutate()}
              className="min-h-[40px] rounded-pill bg-persimmon px-4 text-body font-semibold text-white disabled:opacity-40"
            >
              {submit.isPending ? "Sending…" : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); }}
              className="text-body text-muted"
            >
              Not now
            </button>
          </div>
          {error ? <p className="mt-1 text-caption text-alert">{error}</p> : null}
        </>
      )}
    </div>
  );
}
