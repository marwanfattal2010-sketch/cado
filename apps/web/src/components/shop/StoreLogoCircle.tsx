import { Img } from "../Img";

/**
 * ONE SHOP AS A CIRCLE, AND EVERY SHOP CIRCLE IN THE APP IS THIS ONE.
 *
 * Fashion and Flowers both show a row of shops, and they used to do it with
 * two different components — which is how the row came to mix bordered logos
 * on white with full-bleed storefront photographs, discs in two costumes
 * reading as a broken set rather than a row.
 *
 * WHERE THE MARK COMES FROM, in order:
 *   1. `partners.logo_url` — what the shop uploaded, or what an admin uploaded
 *      on its behalf from the dashboard.
 *   2. a file dropped into `src/assets/stores/<slug>.png`.
 *
 * Nothing else. No mark is fetched from the web and none is drawn by us: a
 * brand's logo belongs to the brand. A `cover_image_url` is not read here at
 * all — a photograph of a shop front does not say which shop it is, and at
 * 80px it is a brown smudge.
 *
 * With no mark at all the disc is PERSIMMON WITH THE SHOP'S INITIALS and its
 * name beneath. The name used to be set inside the disc as well as under it,
 * which read as the same word printed twice at two sizes.
 */
export function StoreLogoCircle({
  name,
  logoUrl,
  photoUrl,
}: {
  name: string;
  /** Already resolved by the caller: the DB's logo_url, or a bundled file. */
  logoUrl?: string | null;
  /**
   * A PHOTOGRAPH of the shop, used only where there is no mark.
   *
   * It is rendered completely differently from a logo — full-bleed, no white
   * ground, no inset — because the two are not the same kind of picture. A
   * wordmark needs air around it and a white field behind it; a photograph
   * shrunk into that same box just looks like a small photograph.
   *
   * Fashion deliberately passes nothing here: that row is brands, and a
   * storefront photo does not tell you which brand you are looking at. The
   * florists are the opposite case — nobody knows their marks, and a picture
   * of the shop is more use than two initials.
   */
  photoUrl?: string | null;
}) {
  if (!logoUrl && photoUrl) {
    return (
      <span className="block aspect-square w-full overflow-hidden rounded-pill bg-page">
        <Img src={photoUrl} alt={name} className="h-full w-full object-cover" />
      </span>
    );
  }

  if (!logoUrl) {
    return (
      <span
        className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-pill bg-persimmon"
        aria-hidden
      >
        <span className="text-[clamp(14px,32%,24px)] font-bold leading-none tracking-[0.02em] text-white">
          {initialsOf(name)}
        </span>
      </span>
    );
  }

  return (
    <span
      className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-pill border border-line bg-white"
      /*
       * 18% inset is what makes a wide wordmark and a round monogram read as
       * the same size: `object-contain` alone fits the long axis to the box,
       * so a 4:1 wordmark would touch the hairline while a square mark floated
       * in the middle. No filter and no tint — the logo ships as its owner
       * drew it.
       */
      style={{ padding: "18%" }}
    >
      <Img src={logoUrl} alt={name} className="h-full w-full object-contain" />
    </span>
  );
}

/**
 * One or two letters for a shop with no logo yet.
 *
 * A short all-caps name IS its own monogram — "GS" must not become "G" — so
 * anything three characters or under survives whole. Two or more words give
 * one letter each from the first two, which makes "Pull & Bear" into PB rather
 * than P&, and "Cedar Street Fashion" into CS.
 *
 * A SINGLE WORD GIVES ONE LETTER, not two. "Nike" as NI and "Bershka" as BE
 * read as truncations — the eye tries to finish the word and cannot. N and B
 * read as monograms, which is what this is.
 */
export function initialsOf(name: string): string {
  const clean = name.replace(/\[.*?\]\s*/g, "").trim();
  if (/^[A-Z0-9]{1,3}$/.test(clean)) return clean;
  const words = clean.split(/[^A-Za-z0-9]+/).filter((w) => w && !/^(and|the|co|de|of)$/i.test(w));
  if (!words.length) return clean.slice(0, 1).toUpperCase();
  if (words.length === 1) return words[0]![0]!.toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}
