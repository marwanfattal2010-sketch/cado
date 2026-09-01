"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/** Store name search. Writes to the URL so a filtered view is a link. */
export function StoreSearch({
  initial,
  keep,
}: {
  initial: string;
  keep: { status?: string; city?: string; sort?: string };
}) {
  const [q, setQ] = useState(initial);
  const router = useRouter();

  const go = (value: string) => {
    const p = new URLSearchParams();
    if (value.trim()) p.set("q", value.trim());
    for (const [k, v] of Object.entries(keep)) if (v && v !== "all") p.set(k, v);
    router.push(`/admin/stores${p.toString() ? `?${p}` : ""}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
      className="flex h-9 min-w-[220px] items-center gap-2 rounded-pill border border-line bg-surface px-3"
    >
      <Search size={14} className="shrink-0 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search stores"
        className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
      />
      {q ? (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => {
            setQ("");
            go("");
          }}
          className="text-muted hover:text-ink"
        >
          <X size={14} />
        </button>
      ) : null}
    </form>
  );
}
