import { ButtonLink } from "../components/ui";
import { WalletIcon, TruckIcon, ShieldCheckIcon } from "../components/Icons";

export const PARTNER_WHATSAPP_NUMBER = "96181900002";
export const PARTNER_EMAIL = "fattalmarwan33@gmail.com";
// Stays hidden until there's a real number worth showing.
const PARTNER_STORE_COUNT = 0;

export const BENEFITS = [
  { Icon: WalletIcon, title: "No upfront cost", desc: "You only pay when you sell." },
  { Icon: TruckIcon, title: "We deliver", desc: "Same-day delivery across Lebanon, handled by us." },
  {
    Icon: ShieldCheckIcon,
    title: "New customers",
    desc: "Get discovered by people who weren't looking for your store, just the right gift.",
  },
];

/**
 * Lives on its own page rather than the homepage: a shopper looking for a
 * birthday present is not the audience, and it was taking up a full section.
 * Linked from the footer instead.
 */
export function Partners() {
  return (
    <div className="bg-ink text-inverse">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-eyebrow uppercase text-gold">For store owners</p>
        <h1 className="mt-3 font-display text-h1 sm:text-display">Own a store? Sell on CADO.</h1>
        <p className="mt-3 max-w-lg text-body text-inverse/70">
          Reach customers across Lebanon who are looking for a gift right now. You keep doing what you do —
          we handle the storefront, the orders, and the delivery.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <b.Icon className="h-6 w-6 shrink-0 text-gold" />
              <div>
                <p className="text-body font-semibold">{b.title}</p>
                <p className="mt-0.5 text-caption text-inverse/60">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink to={`mailto:${PARTNER_EMAIL}`} variant="secondary" className="!bg-canvas !text-ink !ring-0">
            Become a partner
          </ButtonLink>
          <ButtonLink
            to={`https://wa.me/${PARTNER_WHATSAPP_NUMBER}`}
            variant="secondary"
            className="!text-inverse !ring-inverse/30"
            target="_blank"
            rel="noreferrer"
          >
            Talk to us on WhatsApp
          </ButtonLink>
        </div>

        {PARTNER_STORE_COUNT > 0 ? (
          <p className="mt-5 text-caption text-inverse/50">
            Already trusted by {PARTNER_STORE_COUNT}+ stores in Lebanon.
          </p>
        ) : null}
      </div>
    </div>
  );
}
