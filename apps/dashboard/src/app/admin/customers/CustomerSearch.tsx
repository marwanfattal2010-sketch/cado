"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

/** Search by name or phone. Writes to the URL so the view is shareable. */
export function CustomerSearch({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const router = useRouter();
  const go = (v: string) =>
    router.push(v.trim() ? `/admin/customers?q=${encodeURIComponent(v.trim())}` : "/admin/customers");

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); go(q); }}
      className="flex h-9 min-w-[240px] items-center gap-2 rounded-pill border border-line bg-surface px-3"
    >
      <Search size={14} className="shrink-0 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or phone"
        className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
      />
      {q ? (
        <button type="button" aria-label="Clear" onClick={() => { setQ(""); go(""); }} className="text-muted hover:text-ink">
          <X size={14} />
        </button>
      ) : null}
    </form>
  );
}
