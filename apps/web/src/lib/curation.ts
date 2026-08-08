/**
 * Hand-picked results for the combinations people actually ask for.
 *
 * Pure tag-filtering is what makes a gift finder useless: "For Dad /
 * Birthday / Under $50" returning roses and a scented candle teaches people
 * the tool doesn't understand them, and they never come back. So the common
 * combinations are curated by product title, and tag-filtering is only the
 * fallback for combinations nobody has curated yet.
 *
 * Keyed by `${recipient}|${occasion}` — budget is applied afterwards, so one
 * curated list serves every price band and simply narrows.
 */
export const CURATION: Record<string, string[]> = {
  // --- Him / Dad ---------------------------------------------------------
  "him|birthday": [
    "Classic Steel Watch",
    "Leather Weekend Bag",
    "Amber Oud Eau de Parfum",
    "Merino Crewneck",
    "Gourmet Cheese & Wine Basket",
    "Engraved Signet Ring",
    "Woven Cord Bracelet Set",
    "Luxury Nut & Chocolate Basket",
  ],
  "father|birthday": [
    "Gourmet Cheese & Wine Basket",
    "Classic Steel Watch",
    "Amber Oud Eau de Parfum",
    "Luxury Nut & Chocolate Basket",
    "Merino Crewneck",
    "Leather Weekend Bag",
    "Engraved Signet Ring",
  ],
  "father|anniversary": ["Classic Steel Watch", "Gourmet Cheese & Wine Basket", "Amber Oud Eau de Parfum"],

  // --- Her / Mom ---------------------------------------------------------
  "her|birthday": [
    "Signature Rose Bouquet",
    "Layered Chain Necklace",
    "Signature Eau de Parfum",
    "Belgian Truffle Box",
    "Glow Ritual Set",
    "Cashmere Wrap Scarf",
    "Birthstone Pendant",
    "Peony Garden Bouquet",
  ],
  "mother|birthday": [
    "Peony Garden Bouquet",
    "Self-Care Skincare Set",
    "Classic Pearl Earrings",
    "Belgian Truffle Box",
    "Cashmere Wrap Scarf",
    "Luxury Orchid Arrangement",
    "Citrus Bloom Eau de Toilette",
  ],
  "mother|mothers-day": [
    "Peony Garden Bouquet",
    "Luxury Orchid Arrangement",
    "Self-Care Skincare Set",
    "Classic Pearl Earrings",
    "Breakfast in Bed Basket",
  ],

  // --- Partner -----------------------------------------------------------
  "partner|birthday": [
    "Signature Rose Bouquet",
    "Birthstone Pendant",
    "Signature Eau de Parfum",
    "Chocolate Fudge Cake",
    "Gold Vermeil Pendant",
    "Silk Wrap Dress",
    "Celebration Cake",
  ],
  "partner|anniversary": [
    "Signature Rose Bouquet",
    "Gold Vermeil Pendant",
    "Luxury Orchid Arrangement",
    "Signature Eau de Parfum",
    "Birthstone Pendant",
    "Red Velvet Celebration Cake",
  ],

  // --- Friend ------------------------------------------------------------
  "friend|birthday": [
    "Celebration Cake",
    "Belgian Truffle Box",
    "Scented Candle Set",
    "Minimalist Chain Bracelet",
    "Artisan Cookie Tin",
    "Chocolate Fudge Cake",
    "Rose Clay Mask Duo",
  ],
  "friend|housewarming": [
    "The Housewarming Box",
    "Cedar & Wildflower Box",
    "Wildflower Meadow",
    "Artisan Cookie Tin",
    "Gourmet Cheese & Wine Basket",
  ],
  "friend|graduation": ["New Beginnings Box", "Celebration Cake", "Minimalist Chain Bracelet", "Artisan Cookie Tin"],

  // --- Kids --------------------------------------------------------------
  "child|birthday": [
    "Plush Bear Companion",
    "Dress-Up Trunk",
    "STEM Robot Kit",
    "Wooden Building Blocks Set",
    "Remote Control Race Car",
    "Storybook Collection Box",
    "Alphabet Puzzle Board",
    "Kids Denim Jacket",
  ],
  "child|newborn": ["Plush Bear Companion", "Storybook Collection Box", "First Words Flashcards", "Teddy & Tulips Set"],

  // --- Sibling / Colleague ----------------------------------------------
  "sibling|birthday": [
    "Minimalist Chain Bracelet",
    "Everyday Hoodie",
    "Deluxe Makeup Palette",
    "Rose Clay Mask Duo",
    "Woven Cord Bracelet Set",
    "Celebration Cake",
  ],
  "colleague|birthday": [
    "Artisan Cookie Tin",
    "Belgian Truffle Box",
    "The Housewarming Box",
    "Gourmet Cheese & Wine Basket",
    "Scented Candle Set",
  ],
  "colleague|graduation": ["New Beginnings Box", "Artisan Cookie Tin", "Celebration Cake"],
};

export function curatedTitles(recipient?: string | null, occasion?: string | null): string[] | null {
  if (!recipient || !occasion) return null;
  return CURATION[`${recipient}|${occasion}`] ?? null;
}
