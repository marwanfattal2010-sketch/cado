"use client";

import { useState, useTransition } from "react";
import { Star, StarOff } from "lucide-react";
import { setFeatured, setFeaturedRank, setStoreOfWeek, setTagline } from "./actions";

/** One store's storefront placement. Saves on blur, not on a separate button. */
export function MarketingRow({
  partnerId,
  name,
  city,
  isFeatured,
  featuredRank,
  tagline,
  storeOfWeek,
  products,
}: {
  partnerId: string;
  name: string;
  city: string | null;
  isFeatured: boolean;
  featuredRank: number | null;
  tagline: string | null;
  storeOfWeek: boolean;
  products: number;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [feat, setFeat] = useState(isFeatured);
  const [sow, setSow] = useState(storeOfWeek);
  const [rank, setRank] = useState(featuredRank == null ? "" : String(featuredRank));
  const [tag, setTag] = useState(tagline ?? "");

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      setErr(null);
      const res = await fn();
      if (!res.ok) setErr(res.message ?? "Didn't save.");
    });

  return (
    <tr className="border-b border-line last:border-0 hover:bg-surface-sunk">
      <td className="px-4 py-2">
        <p className="text-[13px] text-ink">{name}</p>
        <p className="text-[11px] text-muted">
          {city ?? "—"} · {products} products
        </p>
        {err ? <p className="text-[11px] text-status-red">{err}</p> : null}
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = !feat;
            setFeat(next);
            run(() => setFeatured(partnerId, next));
          }}
          className={`inline-flex items-center gap-1.5 rounded-card px-2 py-1 text-[12px] font-medium transition-colors disabled:opacity-50 ${
            feat ? "bg-ribbon-tint text-ribbon" : "border border-line text-muted hover:text-ink"
          }`}
        >
          {feat ? <Star size={13} /> : <StarOff size={13} />}
          {feat ? "Featured" : "Not featured"}
        </button>
      </td>
      <td className="px-3 py-2">
        <input
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          onBlur={() => {
            if (rank !== (featuredRank == null ? "" : String(featuredRank)) && rank.trim())
              run(() => setFeaturedRank(partnerId, rank));
          }}
          disabled={pending || !feat}
          inputMode="numeric"
          placeholder="—"
          className="h-8 w-14 rounded-card border border-line bg-canvas px-2 text-center text-[13px] text-ink tnum disabled:opacity-40"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onBlur={() => {
            if (tag !== (tagline ?? "")) run(() => setTagline(partnerId, tag));
          }}
          disabled={pending}
          placeholder="Shown under the store name"
          className="h-8 w-full min-w-[180px] rounded-card border border-line bg-canvas px-2 text-[13px] text-ink disabled:opacity-50"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="checkbox"
          checked={sow}
          disabled={pending}
          onChange={(e) => {
            setSow(e.target.checked);
            run(() => setStoreOfWeek(partnerId, e.target.checked));
          }}
          className="h-4 w-4 accent-[var(--ribbon)]"
          aria-label={`Store of the week: ${name}`}
        />
      </td>
    </tr>
  );
}
