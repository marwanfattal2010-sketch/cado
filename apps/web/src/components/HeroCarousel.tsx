import { useEffect, useState } from "react";

const SLIDES = [
  "/categories/jewelry-accessories.jpg",
  "/categories/fashion.jpg",
  "/categories/perfumes.jpg",
  "/categories/flowers-gifts.jpg",
  "/categories/gift-card.jpg",
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-cream" />
    </div>
  );
}
