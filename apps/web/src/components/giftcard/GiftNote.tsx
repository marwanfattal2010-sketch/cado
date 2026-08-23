/**
 * The occasion vocabulary for gift cards.
 *
 * This file used to hold the "little note" block too — three fields with a
 * large non-editable card mockup underneath repeating what had just been
 * typed. The mockup is gone: the send and group screens now ask for To, From
 * and Message as three plain fields, and the card beside them shows the
 * amount. The same information twice was the reason both screens scrolled.
 *
 * What remains is the vocabulary itself, which the database still stores on a
 * pool (`gift_card_pools.occasion`) and the pool page still reads to label
 * one. Nothing here renders.
 */
export type Occasion = "birthday" | "wedding" | "graduation" | "newborn" | "just-because";

export const OCCASIONS: { value: Occasion; label: string }[] = [
  { value: "birthday", label: "Birthday" },
  { value: "wedding", label: "Wedding" },
  { value: "graduation", label: "Graduation" },
  { value: "newborn", label: "New baby" },
  { value: "just-because", label: "Just because" },
];
