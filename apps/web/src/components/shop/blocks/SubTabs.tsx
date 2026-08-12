import { accentColor } from "../../../lib/browse";

/**
 * The text tabs that sit above the circle grid and switch which set of
 * circles it shows.
 *
 * Nothing seeds one of these today: the groups would have to be audiences
 * (Women / Men / Kids) and there is no audience column on products, so any
 * grouping would be invented. The component exists so that the moment a
 * `sub_tabs` block and tiles with a `group_key` are added in the admin, the
 * panel picks it up with no code change.
 *
 * Only the grid below crossfades — its height is left alone, because
 * animating that is what makes the rest of the page jump.
 */
export function SubTabs({
  groups,
  active,
  accentToken,
  onSelect,
}: {
  groups: string[];
  active: string;
  accentToken: string;
  onSelect: (group: string) => void;
}) {
  if (groups.length < 2) return null;

  return (
    <div className="scroll-row pt-4" style={{ ["--row-gap" as string]: "18px" }}>
      {groups.map((group) => {
        const isActive = group === active;
        return (
          <button
            key={group}
            type="button"
            onClick={() => onSelect(group)}
            className={`relative shrink-0 pb-1.5 text-[15px] ${
              isActive ? "font-bold text-ink" : "font-medium text-muted"
            }`}
          >
            {group}
            {isActive ? (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 mx-auto h-[3px] w-6 rounded-full"
                style={{ background: accentColor(accentToken) }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
