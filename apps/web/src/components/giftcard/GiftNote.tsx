import { useEffect, useRef } from "react";

/**
 * The little card that comes with the gift — the one a shop tucks into the
 * bag. Same block on the single gift-card flow and on the group one, so the
 * note reads identically whichever way the card was bought, and the printed
 * card and the on-screen card are fed from the same three fields.
 */

export type Occasion = "birthday" | "wedding" | "graduation" | "newborn" | "just-because";

export const OCCASIONS: { value: Occasion; label: string }[] = [
  { value: "birthday", label: "Birthday" },
  { value: "wedding", label: "Wedding" },
  { value: "graduation", label: "Graduation" },
  { value: "newborn", label: "New baby" },
  { value: "just-because", label: "Just because" },
];

export const NOTE_MAX = 120;

export type NoteValue = { to: string; from: string; message: string };

/**
 * The suggested line for an occasion. "Just because" deliberately suggests
 * nothing — there is no line that fits every reason for sending a gift for
 * no reason, and a wrong guess is worse than a blank field.
 */
export function suggestionFor(occasion: Occasion, to: string): string {
  const name = to.trim();
  switch (occasion) {
    case "birthday":
      return name ? `Happy birthday, ${name}!` : "Happy birthday!";
    case "wedding":
      return "Congratulations to you both!";
    case "graduation":
      return name ? `Congratulations, ${name}!` : "Congratulations!";
    case "newborn":
      return "Congratulations on the new arrival!";
    case "just-because":
      return "";
  }
}

const FIELD =
  "w-full rounded-card border border-line bg-surface px-4 py-3.5 text-body outline-none transition focus:border-ink/35";

/**
 * The note as it will be printed, above the fields that fill it in.
 *
 * Nothing here is invented: an empty To line is simply absent rather than a
 * stand-in name, and an empty message leaves the middle of the card blank —
 * which is exactly what gets printed if the buyer sends it empty.
 */
function NotePreview({ value }: { value: NoteValue }) {
  const to = value.to.trim();
  const from = value.from.trim();
  const message = value.message.trim();
  const blank = !to && !from && !message;

  return (
    <div className="rounded-[12px] border border-line bg-surface px-5 py-4 shadow-rest">
      {blank ? (
        <p className="py-4 text-center text-caption text-muted">Your note will show here as you write it.</p>
      ) : (
        <div className="flex min-h-[96px] flex-col">
          {to ? <p className="font-display text-body">To {to}</p> : null}
          <p className="flex-1 py-2 font-display text-h2 leading-snug">{message}</p>
          {from ? <p className="text-right font-display text-body text-muted">— {from}</p> : null}
        </div>
      )}
    </div>
  );
}

export function GiftNoteBlock({
  occasion,
  value,
  onChange,
  heading = "The little note",
}: {
  occasion: Occasion;
  value: NoteValue;
  onChange: (v: NoteValue) => void;
  heading?: string;
}) {
  /**
   * The suggestion refreshes when the occasion or the recipient changes, but
   * only while the buyer has not written anything of their own. Once they
   * have, the field is theirs — including when they have deliberately
   * cleared it, which is why "" counts as touched and is never refilled.
   */
  const lastSuggestion = useRef(suggestionFor(occasion, value.to));
  const touched = useRef(false);

  useEffect(() => {
    const next = suggestionFor(occasion, value.to);
    if (!touched.current && value.message === lastSuggestion.current) {
      lastSuggestion.current = next;
      if (next !== value.message) onChange({ ...value, message: next });
    } else {
      lastSuggestion.current = next;
    }
    // Deliberately keyed on the two inputs the suggestion is derived from.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasion, value.to]);

  return (
    <section className="mt-7">
      <p className="text-body font-medium">{heading}</p>
      <p className="mt-1 text-caption text-muted">
        Printed on the card that goes with the gift. Leave the message empty if you'd rather not write one.
      </p>

      <div className="mt-3">
        <NotePreview value={value} />
      </div>

      <div className="mt-3 flex gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-caption text-muted">To</span>
          <input
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            placeholder="Their name"
            className={FIELD}
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-caption text-muted">From</span>
          <input
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            placeholder="Your name"
            className={FIELD}
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-caption text-muted">Message</span>
        <input
          value={value.message}
          onChange={(e) => {
            touched.current = true;
            onChange({ ...value, message: e.target.value.slice(0, NOTE_MAX) });
          }}
          maxLength={NOTE_MAX}
          placeholder="One line"
          className={FIELD}
        />
      </label>
      <p className="mt-1 text-right text-caption text-muted">
        {value.message.length}/{NOTE_MAX}
      </p>
    </section>
  );
}
