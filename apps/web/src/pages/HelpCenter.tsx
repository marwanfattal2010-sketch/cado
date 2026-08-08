const FAQS = [
  {
    q: "How does delivery work?",
    a: "Every gift comes from a local boutique store. If your order includes items from more than one store, they may arrive as separate deliveries.",
  },
  {
    q: "How do I pay?",
    a: "Cash on delivery, or a Whish transfer before delivery. You choose at checkout.",
  },
  {
    q: "How do gift cards work?",
    a: "Buy one for any amount, and you'll get a code and a PIN. The recipient enters both to redeem the balance — it can be used across any store on CADO, a little at a time if they like.",
  },
  {
    q: "I lost my gift card PIN. What now?",
    a: "For their protection, PINs are only ever shown once at purchase and can't be recovered afterward. Contact us and we'll help sort it out.",
  },
  {
    q: "Can I return or exchange something?",
    a: "Reach out to us with your order number and we'll coordinate with the store on your behalf.",
  },
];

export function HelpCenter() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <h1 className="font-display text-2xl font-semibold">Help Center</h1>
      <p className="mt-2 text-sm text-ink/50">Common questions, answered.</p>

      <div className="mt-7 flex flex-col gap-3">
        {FAQS.map((f) => (
          <details key={f.q} className="group rounded-card bg-white p-4 ring-1 ring-ink/5">
            <summary className="cursor-pointer list-none text-sm font-medium">
              {f.q}
            </summary>
            <p className="mt-2 text-sm text-ink/60">{f.a}</p>
          </details>
        ))}
      </div>

      <div className="mt-8 rounded-card bg-ink/5 p-5 text-center">
        <p className="text-sm font-medium">Still need help?</p>
        <p className="mt-1 text-sm text-ink/60">Message us on Whish at 81 900 002.</p>
      </div>
    </div>
  );
}
