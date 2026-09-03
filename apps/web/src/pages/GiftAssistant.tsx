import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { PRODUCT_CARD_COLUMNS, type FeedProduct } from "../lib/browse";
import { ProductCard } from "../components/ProductCard";
import { useCategories } from "../hooks/useCategories";
import { OCCASIONS } from "../lib/filters";

/**
 * The gift assistant — a SCRIPTED preview, and it says so.
 *
 * WHY THIS IS A ROUTE AND NOT A SHEET, which is the whole bug fix.
 *
 * It used to render `position: fixed` from inside the home pager. On desktop
 * that was fine. On iOS Safari it was a blank screen with one row of chips
 * floating under the header, because Safari does not honour `position: fixed`
 * for a descendant of a `-webkit-overflow-scrolling: touch` scroll container —
 * and `.panel` is exactly that. The fixed layer was being positioned and
 * clipped against the panel instead of the viewport, so everything above the
 * chips was scrolled out of its own container.
 *
 * Being a route removes the trap rather than working around it: nothing is
 * fixed, nothing is nested inside a scroller, and there is no ancestor that
 * could ever establish a containing block. It also buys the back gesture for
 * free — a sheet held in React state has no history entry to go back to.
 *
 * The conversation is scripted; the PRODUCTS ARE REAL rows matching the
 * answers. `nextAssistantTurn()` is the one function to replace when a real
 * model is wired in.
 */

type Step = "budget" | "occasion" | "category" | "done";

type Msg = { from: "assistant" | "user"; text: string };

type Answers = { budget?: string; occasion?: string; category?: string };

const ORDER: Step[] = ["budget", "occasion", "category", "done"];

const QUESTION: Record<Exclude<Step, "done">, string> = {
  budget: "Roughly what budget?",
  occasion: "What's the occasion?",
  category: "Any particular kind of gift?",
};

const BUDGET_CHIPS = [
  { label: "Under $50", value: "0-50" },
  { label: "$50–100", value: "50-100" },
  { label: "$100–200", value: "100-200" },
  { label: "$200+", value: "200-100000" },
];

/** The scripted brain. Swap this one function for an API call. */
export function nextAssistantTurn(history: { step: Step }): { text: string; step: Step } {
  const next = ORDER[ORDER.indexOf(history.step) + 1] ?? "done";
  return {
    text: next === "done" ? "Here's what I'd pick" : QUESTION[next as Exclude<Step, "done">],
    step: next,
  };
}

export function GiftAssistant() {
  const navigate = useNavigate();
  const categories = useCategories();
  const [step, setStep] = useState<Step>("budget");
  const [messages, setMessages] = useState<Msg[]>([
    { from: "assistant", text: QUESTION.budget },
  ]);
  const [typing, setTyping] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const scroller = useRef<HTMLDivElement>(null);

  /** Opens at the very top, every time. */
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const chips = useMemo(() => {
    if (step === "occasion") {
      return OCCASIONS.slice(0, 6).map((o) => ({ label: o.label, value: o.value }));
    }
    if (step === "category") {
      return (categories.data ?? []).slice(0, 6).map((c) => ({ label: c.name, value: c.id }));
    }
    return BUDGET_CHIPS;
  }, [step, categories.data]);

  /** Answering and skipping are the same move; skipping just records nothing. */
  const advance = (current: Exclude<Step, "done">, value: string | null, label: string) => {
    if (value) setAnswers((a) => ({ ...a, [current]: value }));
    setMessages((m) => [...m, { from: "user", text: label }]);
    setTyping(true);
    // A beat, so it reads like a conversation rather than a form submitting.
    setTimeout(() => {
      const turn = nextAssistantTurn({ step: current });
      setTyping(false);
      setStep(turn.step);
      setMessages((m) => [...m, { from: "assistant", text: turn.text }]);
    }, 550);
  };

  const [min, max] = (answers.budget ?? "0-100000").split("-").map(Number);

  const results = useQuery({
    queryKey: ["assistant-picks", answers.budget, answers.occasion, answers.category],
    enabled: step === "done",
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .eq("is_active", true)
        .gte("price", min)
        .lte("price", max)
        .limit(12);
      if (answers.occasion) q = q.contains("occasion_tags", [answers.occasion]);
      if (answers.category) q = q.eq("category_id", answers.category);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as FeedProduct[];
    },
  });

  /** The applied answers, as chips you can take back off. */
  const applied = [
    answers.budget
      ? {
          key: "budget",
          label: BUDGET_CHIPS.find((b) => b.value === answers.budget)?.label ?? "Budget",
        }
      : null,
    answers.occasion
      ? {
          key: "occasion",
          label: OCCASIONS.find((o) => o.value === answers.occasion)?.label ?? "Occasion",
        }
      : null,
    answers.category
      ? {
          key: "category",
          label: categories.data?.find((c) => c.id === answers.category)?.name ?? "Category",
        }
      : null,
  ].filter(Boolean) as { key: keyof Answers; label: string }[];

  const remove = (key: keyof Answers) => setAnswers((a) => ({ ...a, [key]: undefined }));

  const restart = () => {
    setAnswers({});
    setStep("budget");
    setMessages([{ from: "assistant", text: QUESTION.budget }]);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-persimmon text-[15px] font-bold text-white">
          C
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-body font-semibold text-ink">
            Gift assistant
            {/* Not decoration — this is scripted, and the customer must know. */}
            <span className="rounded-pill bg-surface-sunk px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              Preview
            </span>
          </p>
          <p className="text-caption text-muted">Three questions, skip any of them</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Close"
          className="tap-44 px-2 text-[18px] text-muted"
        >
          ✕
        </button>
      </header>

      <div ref={scroller} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-card px-3.5 py-2.5 text-body ${
              m.from === "user"
                ? "ml-auto bg-persimmon text-white"
                : "mr-auto bg-surface text-ink shadow-rest"
            }`}
          >
            {m.text}
          </div>
        ))}

        {typing ? (
          <div className="mr-auto flex gap-1 rounded-card bg-surface px-3.5 py-3 shadow-rest">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-pill bg-muted"
                style={{ opacity: 0.4 + i * 0.2 }}
              />
            ))}
          </div>
        ) : null}

        {step !== "done" && !typing ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {chips.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => advance(step, c.value, c.label)}
                className="rounded-pill border border-persimmon px-3.5 py-2 text-body font-medium text-persimmon"
              >
                {c.label}
              </button>
            ))}
            {/* Every question is skippable. Skipping records no answer, so the
                grid at the end is simply less narrow. */}
            <button
              type="button"
              onClick={() => advance(step, null, "Skip")}
              className="rounded-pill border border-line px-3.5 py-2 text-body font-medium text-muted"
            >
              Skip
            </button>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="pt-1">
            {applied.length ? (
              <div className="flex flex-wrap gap-2 pb-3">
                {applied.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => remove(a.key)}
                    className="inline-flex items-center gap-1.5 rounded-pill border border-persimmon px-3 py-1.5 text-caption font-medium text-persimmon"
                  >
                    {a.label}
                    <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
            ) : null}

            {results.isLoading ? (
              <p className="text-caption text-muted">Finding gifts…</p>
            ) : results.error ? (
              <div className="rounded-card bg-surface p-4 text-body shadow-rest">
                <p className="text-ink">Something went wrong finding gifts.</p>
                <button
                  type="button"
                  onClick={() => results.refetch()}
                  className="mt-3 rounded-pill bg-persimmon px-4 py-2 text-caption font-semibold text-white"
                >
                  Try again
                </button>
              </div>
            ) : (results.data ?? []).length === 0 ? (
              /* A real empty state. The old one said "try a wider budget" and
                 offered no way to do it; this names the problem and gives two
                 ways out. */
              <div className="rounded-card bg-surface p-5 text-center shadow-rest">
                <p className="text-body font-semibold text-ink">No gifts match — clear a filter</p>
                <p className="mt-1 text-caption text-muted">
                  Take one of the chips above off, or start the questions again.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={restart}
                    className="rounded-pill bg-persimmon py-2.5 text-body font-semibold text-white"
                  >
                    Start again
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="rounded-pill border border-line py-2.5 text-body font-medium text-ink"
                  >
                    Back to home
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-2 gap-y-[10px]">
                {(results.data ?? []).map((p) => (
                  <ProductCard
                    key={p.id}
                    {...(p as unknown as Parameters<typeof ProductCard>[0])}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-line px-4 py-3">
        <input
          disabled
          placeholder="Typing comes with the full assistant"
          aria-label="Free text is not available in the preview"
          className="h-11 w-full rounded-pill border border-line bg-surface-sunk px-4 text-body text-muted"
        />
      </div>
    </div>
  );
}
