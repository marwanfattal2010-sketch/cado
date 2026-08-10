import { AREAS } from "../lib/area";

const FAQS = [
  {
    q: "How does delivery work?",
    a: "Every gift comes from a local boutique store. If your order includes items from more than one store, they may arrive as separate deliveries.",
  },
  {
    q: "How do I pay?",
    a: "Cash on delivery, or a Whish transfer before delivery. You choose at checkout. Card payment isn't available yet.",
  },
  {
    // Gift cards lost their PIN in migration 0021 — one 12-character code is
    // the whole thing now. This answer still described the old two-part
    // system, and the next question was about recovering a PIN that no
    // longer exists.
    q: "How do gift cards work?",
    a: "Buy one for any amount from $10 to $500. You get a single 12-character code — share it however you like. Whoever has it can spend the balance at any store on CADO, a little at a time.",
  },
  {
    q: "I lost my gift card code. What now?",
    a: "Message us with the email you bought it from and roughly when, and we'll look it up for you.",
  },
  {
    q: "Can I return or exchange something?",
    a: "Reach out to us with your order number and we'll coordinate with the store on your behalf.",
  },
  {
    q: "Where do you deliver?",
    a: `Right now: ${AREAS.join(", ")}.`,
  },
];

export function HelpCenter() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="font-display text-h1">Help Center</h1>
      <p className="mt-2 text-body text-muted">Common questions, answered.</p>

      <div className="mt-7 flex flex-col gap-3">
        {FAQS.map((f) => (
          <details key={f.q} className="group rounded-card bg-surface p-4 shadow-rest">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-body font-medium">
              {f.q}
              <span aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-90">
                ›
              </span>
            </summary>
            <p className="mt-2 text-body text-muted">{f.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-8 rounded-card bg-surface-sunk p-5 text-center">
        <p className="text-body font-medium">Still need help?</p>
        <p className="mt-1 text-body text-muted">Reach us on 81 900 002.</p>
      </div>
    </div>
  );
}
