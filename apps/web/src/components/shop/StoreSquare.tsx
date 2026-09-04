import { Link } from "react-router-dom";
import { Img } from "../Img";
import { storePath } from "../../lib/routes";

/**
 * One shop, as a circle with its name under it.
 *
 * The LOGO where there is one, the cover photo only where there is not: a rack
 * of clothes does not tell you which shop you are looking at, and a wordmark
 * does. Names wrap to two lines and break on the space, so "Anchor & Oak" is
 * never cut to "Anchor &".
 */
export function StoreSquare({
  store,
}: {
  store: { slug: string; name: string; art: string | null; isLogo: boolean };
}) {
  return (
    <Link
      to={storePath({ slug: store.slug })}
      className="flex min-w-0 flex-col items-center gap-1.5 transition-transform duration-press ease-out active:scale-[0.96]"
    >
      <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-pill border border-[#ECECEC] bg-white">
        {store.art ? (
          <Img
            src={store.art}
            className={store.isLogo ? "h-full w-full object-contain p-2" : "h-full w-full object-cover"}
          />
        ) : null}
      </span>
      <span className="line-clamp-2 w-full break-words text-center text-[10.5px] font-medium leading-tight text-ink">
        {store.name}
      </span>
    </Link>
  );
}
