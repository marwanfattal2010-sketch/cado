import { Navigate, useParams } from "react-router-dom";
import { useBrowseConfig } from "../hooks/useBrowseConfig";

/**
 * /category/:slug — kept only so old links keep working.
 *
 * There is one category page now and it is a tab on "/", which is what makes
 * a category swipeable and puts the tab bar above it. Keeping a second layout
 * at this route would mean two versions of the same screen drifting apart,
 * which is exactly what the rebuild was for.
 *
 * The redirect waits for the tab list rather than guessing, because the tab
 * slug is not always the category slug — `jewelry-accessories` lives on the
 * `jewelry` tab. `replace` so the old URL does not sit in history as a step
 * to go "back" to.
 */
export function CategoryRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const { hrefForCategory, isLoading } = useBrowseConfig();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-8" aria-busy="true">
        <div className="skeleton h-6 w-40 rounded-pill" />
      </div>
    );
  }

  return <Navigate to={slug ? hrefForCategory(slug) : "/"} replace />;
}
