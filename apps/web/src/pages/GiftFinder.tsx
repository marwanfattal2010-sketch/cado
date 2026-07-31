import { useCategories } from "../hooks/useCategories";
import { CategoryTile } from "../components/CategoryTile";

export function GiftFinder() {
  const categories = useCategories();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-center font-display text-4xl">What are you looking for?</h1>
      <p className="mt-3 text-center text-ink/50">Pick a category and see the best stores for it — that's it.</p>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {categories.data?.map((cat) => (
          <CategoryTile key={cat.id} slug={cat.slug} name={cat.name} />
        ))}
      </div>
    </div>
  );
}
