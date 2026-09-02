import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { PRODUCT_CARD_COLUMNS } from "../lib/browse";
import { ProductCard } from "./ProductCard";

/**
 * The gift assistant (spec 1.10) — a SCRIPTED preview, and it says so.
 *
 * The "Preview" tag beside the title is not decoration: this does not
 * understand anything, and a chat window that looks like an assistant while
 * following a fixed script is the kind of thing a customer would rightly feel
 * lied to about. The free-text box is present and disabled with a label saying
 * why, rather than pretending to read what someone types.
 *
 * The products at the end are REAL rows matching the chosen filters. Only the
 * conversation is scripted.
 *
 * `nextAssistantTurn()` is the one function to replace when a real model is
 * wired in: it takes the history and returns the next message. Everything else
 * — bubbles, typing delay, chips, results — stays as it is.
 */

type Step = "recipient" | "occasion" | "budget" | "done";

type Msg =
  | { from: "assistant"; text: string }
  | { from: "user"; text: string };

const CHIPS: Record<Exclude<Step, "done">, { label: string; value: string }[]> = {
  recipient: [
    { label: "Her", value: "her" },
    { label: "Him", value: "him" },
    { label: "Mom", value: "mother" },
    { label: "Dad", value: "father" },
    { label: "Friend", value: "friend" },
    { label: "Kids", value: "child" },
  ],
  occasion: [
    { label: "Visiting someone", value: "visiting" },
    { label: "Birthday", value: "birthday" },
    { label: "Anniversary", value: "anniversary" },
    { label: "New baby", value: "newborn" },
    { label: "Graduation", value: "graduation" },
    { label: "Just because", value: "just-because" },
  ],
  budget: [
    { label: "Under $50", value: "0-50" },
    { label: "$50–100", value: "50-100" },
    { label: "$100–200", value: "100-200" },
    { label: "$200+", value: "200-100000" },
  ],
};

const QUESTION: Record<Exclude<Step, "done">, string> = {
  recipient: "Who is the gift for?",
  occasion: "What's the occasion?",
  budget: "Roughly what budget?",
};

/**
 * The scripted brain. Swap this one function for an API call and the rest of
 * the sheet keeps working unchanged.
 */
export function nextAssistantTurn(history: { step: Step }): { text: string; step: Step } {
  const order: Step[] = ["recipient", "occasion", "budget", "done"];
  const next = order[order.indexOf(history.step) + 1] ?? "done";
  return {
    text: next === "done" ? "Here's what I'd pick" : QUESTION[next as Exclude<Step, "done">],
    step: next,
  };
}

export function GiftAssistantSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>("recipient");
  const [messages, setMessages] = useState<Msg[]>([{ from: "assistant", text: QUESTION.recipient }]);
  const [typing, setTyping] = useState(false);
  const [answers, setAnswers] = useState<{ recipient?: string; occasion?: string; budget?: string }>({});
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // Reset when reopened, so a second visit is a fresh conversation.
  useEffect(() => {
    if (!open) return;
    setStep("recipient");
    setMessages([{ from: "assistant", text: QUESTION.recipient }]);
    setAnswers({});
  }, [open]);

  const [min, max] = (answers.budget ?? "0-100000").split("-").map(Number);

  const results = useQuery({
    queryKey: ["assistant-picks", answers.recipient, answers.occasion, answers.budget],
    enabled: step === "done" && !!answers.budget,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select(PRODUCT_CARD_COLUMNS)
        .eq("is_active", true)
        .gte("price", min)
        .lte("price", max)
        .limit(4);
      if (answers.recipient) q = q.contains("recipient_tags", [answers.recipient]);
      if (answers.occasion) q = q.contains("occasion_tags", [answers.occasion]);
      const { data } = await q;
      // If the exact combination has nothing, drop the occasion before the
      // budget — a budget is a hard constraint, an occasion is a preference.
      if ((data ?? []).length === 0 && answers.occasion) {
        let relaxed = supabase
          .from("products").select(PRODUCT_CARD_COLUMNS).eq("is_active", true)
          .gte("price", min).lte("price", max).limit(4);
        if (answers.recipient) relaxed = relaxed.contains("recipient_tags", [answers.recipient]);
        const { data: d2 } = await relaxed;
        return d2 ?? [];
      }
      return data ?? [];
    },
  });

  const choose = (value: string, label: string) => {
    const current = step as Exclude<Step, "done">;
    setAnswers((a) => ({ ...a, [current]: value }));
    setMessages((m) => [...m, { from: "user", text: label }]);
    setTyping(true);
    // A beat, so it reads like a conversation rather than a form submitting.
    setTimeout(() => {
      const turn = nextAssistantTurn({ step: current });
      setTyping(false);
      setStep(turn.step);
      setMessages((m) => [...m, { from: "assistant", text: turn.text }]);
    }, 600);
  };

  if (!open) return null;

  const filterHref = `/gift-finder?skip=1${answers.recipient ? `&recipient=${answers.recipient}` : ""}${
    answers.occasion ? `&occasion=${answers.occasion}` : ""
  }${answers.budget ? `&f.min=${min}&f.max=${max}` : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
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
          <p className="text-caption text-muted">Answer three questions</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="px-2 text-muted">
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
              <span key={i} className="h-1.5 w-1.5 rounded-pill bg-muted" style={{ opacity: 0.4 + i * 0.2 }} />
            ))}
          </div>
        ) : null}

        {step !== "done" && !typing ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {CHIPS[step].map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => choose(c.value, c.label)}
                className="rounded-pill border border-persimmon px-3.5 py-2 text-body font-medium text-persimmon"
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : null}

        {step === "done" ? (
          results.isLoading ? (
            <p className="text-caption text-muted">Finding gifts…</p>
          ) : (results.data ?? []).length === 0 ? (
            <p className="text-body text-muted">
              Nothing in that budget yet — try a wider one.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-2 gap-y-[10px] pt-1">
                {(results.data ?? []).map((p) => (
                  <ProductCard key={p.id} {...(p as unknown as Parameters<typeof ProductCard>[0])} />
                ))}
              </div>
              <Link
                to={filterHref}
                onClick={onClose}
                className="mt-2 block rounded-pill bg-persimmon py-3 text-center text-body font-semibold text-white"
              >
                See all matches
              </Link>
            </>
          )
        ) : null}
      </div>

      <div className="border-t border-line px-4 py-3">
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
