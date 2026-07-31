import { useCategories } from "../hooks/useCategories";
import { CategoryTile } from "../components/CategoryTile";
import { GiftCardTile } from "../components/GiftCardTile";

export function GiftFinder() {
  const categories = useCategories();

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-center font-display text-4xl">What are you looking for?</h1>
      <p className="mt-3 text-center text-ink/50">Pick a category and see the best stores for it — that's it.</p>

      <div className="mt-10 flex flex-col gap-5">
        {categories.data?.map((cat) => (
          <CategoryTile key={cat.id} slug={cat.slug} name={cat.name} />
        ))}
        <GiftCardTile />
      </div>
    </div>
  );
}
