import { BasketIcon, GiftIcon, ShieldCheckIcon, TruckIcon, WalletIcon } from "./Icons";
import { RibbonDivider } from "./ui";

/**
 * The "How CADO works" explainer.
 *
 * It used to sit on the Account page, between Log out and the footer, and it
 * does not belong there: Account is a place you go to DO something, not to
 * read the pitch. It lives here as its own component, ready to be placed on
 * Home — it is not currently rendered anywhere, and that is deliberate rather
 * than an accident. See the note in the Aug 24 handoff entry.
 *
 * Every claim on it is one CADO actually makes elsewhere on the site
 * (same-day, pay on delivery, verified stores). Nothing here is a number, a
 * rating or a count, because there is no real one to show.
 *
 * Step 2 used to be "We wrap it — your note inside, free". CADO is not
 * offering gift wrapping (Marwan, 2026-08: "i dont need gift wrapping"), so
 * it is replaced by the step that actually happens in the middle: CADO
 * collects the gift from the store. That is not a new promise — it is the
 * same one /partners already makes to store owners.
 */
const HOW_IT_WORKS = [
  { n: "1", Icon: GiftIcon, title: "Choose a gift", desc: "From stores across Lebanon." },
  { n: "2", Icon: BasketIcon, title: "We collect it", desc: "From the store, the same day." },
  { n: "3", Icon: TruckIcon, title: "Arrives today", desc: "Order before midnight, arrives today." },
];

/** Three, not four — the "Free gift wrapping" badge is gone with the
 *  service. A claim we no longer make does not get relocated. */
const WHY_CADO = [
  { Icon: TruckIcon, label: "Same-day delivery" },
  { Icon: ShieldCheckIcon, label: "Verified Lebanese stores" },
  { Icon: WalletIcon, label: "Pay on delivery" },
];

export function HowCadoWorks() {
  return (
    <section className="mt-10">
      <RibbonDivider className="mb-4" />
      <h2 className="text-center font-display text-h2">How CADO works</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {HOW_IT_WORKS.map((s) => (
          <div key={s.n} className="rounded-card bg-surface p-3 text-center shadow-rest">
            <s.Icon className="mx-auto h-5 w-5 text-persimmon" />
            <p className="mt-1.5 text-caption font-semibold">{s.title}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {WHY_CADO.map((w) => (
          <div
            key={w.label}
            className="flex flex-col items-center gap-2 rounded-card bg-surface py-5 text-center shadow-rest"
          >
            <w.Icon className="h-6 w-6 text-persimmon" />
            <span className="text-caption font-medium text-muted">{w.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
