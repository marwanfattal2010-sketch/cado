import { Link } from "react-router-dom";

/**
 * The heading above a full-bleed rail: title left, optional "See all" right.
 *
 * Lifted out of the old Home page unchanged when Home was replaced by the
 * Shop page, because the sections that moved across kept their own look. The
 * `px-4` here is the same 16px as `--page-x`, so a title still lines up with
 * the first card of the rail beneath it and with the Shop page's own
 * headings.
 */
export function SectionHead({ title, to }: { title: string; to?: string }) {
  return (
    <div className="mx-auto flex max-w-6xl items-end justify-between gap-3 px-4 pb-3">
      <h2 className="font-display text-h2">{title}</h2>
      {to ? (
        <Link
          to={to}
          className="tap-44 shrink-0 pb-0.5 text-caption font-medium text-ink underline underline-offset-4"
        >
          See all
        </Link>
      ) : null}
    </div>
  );
}
