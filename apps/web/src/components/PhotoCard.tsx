import { Link } from "react-router-dom";
import { Img } from "./Img";

/**
 * A photo card in the occasion rail.
 *
 * Lifted out of the old Home page unchanged. The text pills that once
 * replaced these read as a different, lesser control, which is why the
 * photos came back — so nothing here is restyled, only relocated.
 *
 * aspect-[7/9] on a 140px card is the same 140x180 box a fixed height gave,
 * but expressed as a ratio: the slot exists at layout time, before the photo
 * has a single byte, so the rail never reflows. The sunk tint is the
 * placeholder that shows through until it does.
 */
export function PhotoCard({ to, img, label }: { to: string; img: string; label: string }) {
  return (
    <Link
      to={to}
      className="relative flex aspect-[7/9] w-[140px] shrink-0 items-end overflow-hidden rounded-card bg-surface-sunk p-3"
    >
      <Img src={img} className="absolute inset-0 h-full w-full object-cover" />
      {/* black/… works where a token/… would not: `black` is a real hex in
          Tailwind's default palette, so the alpha actually compiles. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      {/* w-full so a long label wraps inside the card instead of running off
          its right edge and being sliced by overflow-hidden — which is how
          "Get Well Soon" was arriving as "Get Well S". */}
      <span className="relative w-full break-words font-display text-[14px] font-semibold leading-tight text-inverse drop-shadow">
        {label}
      </span>
    </Link>
  );
}
