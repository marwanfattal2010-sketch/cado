import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatMoney } from "../lib/money";
import { OCCASIONS } from "../components/giftcard/GiftNote";
import { DigitalCardMock, EnvelopeCardArt } from "../components/giftcard/GiftCardArt";
import { QrCode } from "../components/QrCode";
import { Button, ButtonLink } from "../components/ui";
import { WhatsAppIcon } from "../components/Icons";
import { useAuth } from "../lib/auth";
import {
  useCancelPool,
  useIssuePoolCard,
  useMyPoolBySlug,
  usePool,
  type Pool,
} from "../hooks/useGiftCardPools";

const money = (cents: number) => formatMoney(cents / 100);

function occasionLabel(value: string) {
  return OCCASIONS.find((o) => o.value === value)?.label ?? "gift";
}

/**
 * "Rana's birthday gift" — the heading, built from the two fields the
 * organizer filled in. Nothing is invented: if the occasion is "just
 * because" there is no natural possessive phrase, so it reads plainly.
 */
function poolTitle(pool: Pool) {
  const name = pool.recipient_name;
  if (pool.occasion === "just-because") return `A gift for ${name}`;
  return `${name}'s ${occasionLabel(pool.occasion).toLowerCase()} gift`;
}

/**
 * Persimmon fill on a cream track, and it grows from zero exactly once when
 * the page opens. The width is driven off confirmed money only — pending
 * contributions are named underneath and never inside the bar, because a bar
 * that counts money nobody has checked yet is a promise the group can't
 * keep.
 */
function ProgressBar({ confirmed, goal }: { confirmed: number; goal: number }) {
  const target = goal > 0 ? Math.min(100, (confirmed / goal) * 100) : 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Next frame, so the browser paints 0 first and then animates to target.
    const id = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div
      className="mt-3 h-3 w-full overflow-hidden rounded-pill bg-canvas ring-1 ring-line"
      role="progressbar"
      aria-valuenow={Math.round(target)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-pill bg-persimmon transition-[width] duration-700 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const text = `${title} — chip in here: ${url}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // cancelled — fall through to copy
      }
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copy = async () => {
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const BTN =
    "flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-card border border-line bg-surface px-3 text-caption font-medium transition active:scale-[0.98]";

  return (
    <div className="mt-4 flex gap-2">
      <button type="button" onClick={share} className={BTN}>
        Share link
      </button>
      <button type="button" onClick={copy} className={BTN}>
        {copied ? "Copied" : "Copy link"}
      </button>
      {/* Plain wa.me deep link — no API, no token, works today. */}
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noreferrer"
        className={BTN}
      >
        <WhatsAppIcon className="h-4 w-4" />
        WhatsApp
      </a>
    </div>
  );
}

function Contributors({ pool }: { pool: Pool }) {
  if (pool.contributors.length === 0) {
    return (
      <p className="mt-4 text-body text-muted">No one has chipped in yet. Share the link to get started.</p>
    );
  }

  return (
    <ul className="mt-4 overflow-hidden rounded-card border border-line bg-surface">
      {pool.contributors.map((c, i) => (
        <li
          key={`${c.name}-${i}`}
          className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? "" : "border-t border-line"}`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-persimmon/10 font-display text-caption text-persimmon">
            {c.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body">{c.name}</span>
            {c.message ? <span className="block truncate text-caption text-muted">{c.message}</span> : null}
          </span>
          <span className="shrink-0 text-right">
            <span className="block text-body font-semibold">
              {c.hidden ? <span className="text-caption font-normal text-muted">amount hidden</span> : money(c.amount_cents ?? 0)}
            </span>
            {c.status === "pending" ? (
              <span className="block text-caption text-muted">waiting to be confirmed</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The organizer's end of it: send the card, or call the whole thing off. */
function OrganizerPanel({ pool, slug }: { pool: Pool; slug: string }) {
  const mine = useMyPoolBySlug(slug, pool.is_organizer);
  const issue = useIssuePoolCard(slug);
  const cancel = useCancelPool(slug);

  const [choosing, setChoosing] = useState(false);
  const [delivery, setDelivery] = useState<"digital" | "physical">("digital");
  const [card, setCard] = useState<{ code: string; original_amount: number } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poolId = mine.data?.id;

  const send = async () => {
    setError(null);
    if (!poolId) return setError("Couldn't load this group. Refresh and try again.");
    try {
      setCard(await issue.mutateAsync({ poolId, deliveryMethod: delivery }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  if (card) {
    const shareUrl = `${window.location.origin}/gift-cards/redeem?code=${encodeURIComponent(card.code)}`;
    return (
      <section className="mt-8 rounded-[16px] border border-line bg-surface p-5">
        <h2 className="font-display text-h2">The card is ready</h2>
        <div className="mt-4 rounded-sheet bg-ink p-6 text-center text-inverse">
          <p className="text-eyebrow uppercase text-gold">Cado gift card</p>
          <p className="mt-3 font-display text-display">{formatMoney(card.original_amount)}</p>
          <p className="mt-3 break-all font-display text-h1 tracking-[0.15em]">{card.code}</p>
        </div>
        {delivery === "digital" ? (
          <>
            <QrCode value={shareUrl} alt="Gift card QR code" className="mx-auto mt-5 h-[200px] w-[200px]" />
            <p className="mt-3 text-center text-caption text-muted">
              Send {pool.recipient_name} the link or the code. It works at every store on CADO.
            </p>
          </>
        ) : (
          <p className="mt-4 text-body text-muted">
            We'll deliver the printed card to your address, with the group's note inside the envelope.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-[16px] border border-line bg-surface p-5">
      <h2 className="font-display text-h2">You're the organizer</h2>

      {pool.status === "cancelled" ? (
        <p className="mt-2 text-body text-muted">
          This group is cancelled. Everyone who paid is on the refund list for us to sort out by hand.
        </p>
      ) : pool.status === "sent" ? (
        <p className="mt-2 text-body text-muted">The card has been sent.</p>
      ) : (
        <>
          {choosing ? (
            <div className="mt-4">
              <p className="text-body font-medium">How should it arrive?</p>
              <div className="mt-3 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setDelivery("digital")}
                  aria-pressed={delivery === "digital"}
                  className={`rounded-[12px] p-3 text-left ${delivery === "digital" ? "border-2 border-persimmon" : "border border-line"}`}
                >
                  <DigitalCardMock amount={money(pool.goal_cents)} className="w-full max-w-[220px]" />
                  <span className="mt-2 block text-body font-semibold">Digital card</span>
                  <span className="text-caption text-muted">A link and a QR code. Arrives instantly.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDelivery("physical")}
                  aria-pressed={delivery === "physical"}
                  className={`rounded-[12px] p-3 text-left ${delivery === "physical" ? "border-2 border-persimmon" : "border border-line"}`}
                >
                  <EnvelopeCardArt className="w-full max-w-[220px]" />
                  <span className="mt-2 block text-body font-semibold">Real card, delivered</span>
                  <span className="text-caption text-muted">
                    A real CADO card in an envelope, hand-delivered with a small note.
                  </span>
                </button>
              </div>
              <Button onClick={send} disabled={issue.isPending} variant="accent" fullWidth className="mt-4">
                {issue.isPending ? "Sending…" : `Send ${money(pool.goal_cents)} card`}
              </Button>
            </div>
          ) : (
            <>
              <Button
                onClick={() => setChoosing(true)}
                disabled={pool.status !== "funded"}
                variant="accent"
                fullWidth
                className="mt-4"
              >
                Send the gift card
              </Button>
              {pool.status !== "funded" ? (
                <p className="mt-2 text-center text-caption text-muted">
                  You can send it once {money(pool.goal_cents)} is confirmed —{" "}
                  {money(Math.max(0, pool.goal_cents - pool.confirmed_cents))} to go.
                </p>
              ) : null}
            </>
          )}

          {pool.status === "open" ? (
            confirmCancel ? (
              <div className="mt-4 rounded-card border border-line p-3">
                <p className="text-body">
                  Cancel this group? Nobody is refunded automatically — everyone who already paid goes onto a
                  list for us to refund by hand.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={() => poolId && cancel.mutate(poolId)}
                    disabled={cancel.isPending || !poolId}
                    variant="secondary"
                    size="md"
                  >
                    {cancel.isPending ? "Cancelling…" : "Yes, cancel it"}
                  </Button>
                  <Button onClick={() => setConfirmCancel(false)} variant="ghost" size="md">
                    Keep it open
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="mt-3 min-h-[44px] w-full text-caption font-medium text-muted underline underline-offset-4"
              >
                Cancel group
              </button>
            )
          ) : null}
        </>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-body text-alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export function GiftCardGroupPool() {
  const { slug } = useParams<{ slug: string }>();
  const { session } = useAuth();
  const pool = usePool(slug);

  if (pool.isLoading) {
    return (
      <div className="mx-auto max-w-lg px-5 py-10" aria-busy="true">
        <div className="skeleton h-6 w-48 rounded-pill" />
        <div className="skeleton mt-4 h-10 w-40 rounded-pill" />
        <div className="skeleton mt-4 h-3 w-full rounded-pill" />
      </div>
    );
  }

  if (!pool.data) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="font-display text-h1">Group gift not found</h1>
        <p className="mt-2 text-body text-muted">
          That link doesn't lead anywhere. Ask whoever shared it to send it again.
        </p>
        <ButtonLink to="/gift-cards" variant="accent" className="mt-6">
          Gift cards
        </ButtonLink>
      </div>
    );
  }

  const p = pool.data;
  const url = `${window.location.origin}/gift-cards/group/${p.slug}`;
  const closed = p.status !== "open";

  return (
    <div className="mx-auto max-w-lg px-5 py-6">
      <p className="text-eyebrow uppercase text-muted">Group gift</p>
      <h1 className="mt-1 font-display text-h1">{poolTitle(p)}</h1>

      <div className="mt-6 rounded-[16px] border border-line bg-surface p-5">
        <p className="font-display text-display">
          {money(p.confirmed_cents)} <span className="text-muted">of {money(p.goal_cents)}</span>
        </p>
        <ProgressBar confirmed={p.confirmed_cents} goal={p.goal_cents} />

        {/* Only shown when there really is money waiting. Never in the bar. */}
        {p.pending_cents > 0 ? (
          <p className="mt-2 text-caption text-muted">{money(p.pending_cents)} waiting to be confirmed</p>
        ) : null}

        {p.deadline ? (
          <p className="mt-2 text-caption text-muted">Closes {new Date(p.deadline).toLocaleDateString()}</p>
        ) : null}

        {closed ? (
          <p className="mt-4 rounded-card bg-surface-sunk px-3 py-2 text-caption text-muted">
            {p.status === "funded"
              ? "Fully funded — the organizer can send the card now."
              : p.status === "sent"
                ? "The card has been sent."
                : "This group gift was cancelled."}
          </p>
        ) : (
          <ButtonLink to={`/gift-cards/group/${p.slug}/chip-in`} variant="accent" fullWidth className="mt-4">
            Chip in
          </ButtonLink>
        )}

        <ShareRow url={url} title={poolTitle(p)} />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-h2">Who's chipped in</h2>
        <Contributors pool={p} />
      </section>

      {p.is_organizer && session ? <OrganizerPanel pool={p} slug={p.slug} /> : null}

      <p className="mt-8 text-center text-caption text-muted">
        <Link to="/gift-cards" className="underline underline-offset-4">
          How CADO gift cards work
        </Link>
      </p>
      <div className="h-24" />
    </div>
  );
}
