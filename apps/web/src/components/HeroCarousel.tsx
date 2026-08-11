import { useEffect, useState } from "react";

/**
 * Wrapped presents, not category photos. The hero used to cycle the same
 * jewelry/fashion/perfume shots the category grid shows further down, which
 * made the top of the page look like a repeat of itself — and none of them
 * said "gift". These are all wrapped gifts in the brand's gold/cream range.
 */
const SLIDES = [
  "/hero/gifts-1.jpg",
  "/hero/gifts-2.jpg",
  "/hero/gifts-3.jpg",
  "/hero/gifts-4.jpg",
  "/hero/gifts-5.jpg",
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
