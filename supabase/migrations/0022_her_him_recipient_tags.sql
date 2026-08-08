-- "For Her" and "For Him" are shown as recipient shortcuts on the homepage,
-- but no product carried a matching recipient_tag, so both cards led to a
-- guaranteed-empty result. Add the two tags across the existing catalogue.
--
-- These cut across the relationship tags (mother/father/partner/...) rather
-- than replacing them: a necklace can be both "for her" and "for mother".
-- Appended with array_append guarded by a NOT-contains check so re-running
-- this is safe.

-- For Her
update products set recipient_tags = array_append(recipient_tags, 'her')
where not (recipient_tags @> array['her']) and title in (
  'Cashmere Wrap Scarf',
  'Silk Wrap Dress',
  'Birthstone Pendant',
  'Classic Pearl Earrings',
  'Gold Vermeil Pendant',
  'Layered Chain Necklace',
  'Minimalist Chain Bracelet',
  'Citrus Bloom Eau de Toilette',
  'Glow Ritual Set',
  'Rose Clay Mask Duo',
  'Self-Care Skincare Set',
  'Deluxe Makeup Palette',
  'Signature Eau de Parfum',
  'Peony Garden Bouquet',
  'Signature Rose Bouquet',
  'Luxury Orchid Arrangement',
  'Wildflower Meadow',
  'Cedar & Wildflower Box',
  'Breakfast in Bed Basket',
  'Red Velvet Celebration Cake'
);

-- For Him
update products set recipient_tags = array_append(recipient_tags, 'him')
where not (recipient_tags @> array['him']) and title in (
  'Leather Weekend Bag',
  'Merino Crewneck',
  'Tailored Blazer',
  'Everyday Hoodie',
  'Classic Steel Watch',
  'Engraved Signet Ring',
  'Woven Cord Bracelet Set',
  'Amber Oud Eau de Parfum',
  'Gourmet Cheese & Wine Basket',
  'Luxury Nut & Chocolate Basket',
  'Artisan Cookie Tin',
  'Classic Runner Sneakers'
);
