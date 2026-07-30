import { Link } from "react-router-dom";
import { primaryImage } from "../lib/images";

type ProductCardProps = {
  id: string;
  title: string;
  price: number;
  currency: string;
  product_images?: { storage_path: string; is_primary: boolean }[] | null;
};

export function ProductCard({ id, title, price, currency, product_images }: ProductCardProps) {
  const uri = primaryImage(product_images);
  return (
    <Link to={`/product/${id}`} className="group block w-full">
      <div className="aspect-square w-full overflow-hidden rounded-2xl bg-black/5">
        {uri ? (
          <img
            src={uri}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink/20">No image</div>
        )}
      </div>
      <p className="mt-3 truncate text-sm font-medium">{title}</p>
      <p className="text-sm text-ink/50">
        {currency} {price.toFixed(2)}
      </p>
    </Link>
  );
}
