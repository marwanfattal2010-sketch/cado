-- 0090 — Fashion has no menswear, so stop claiming it does.
--
-- Both products filed under Fashion > Men are photographed on women:
--   Everyday Hoodie   — a woman in a sand hoodie, three-quarter back view
--   Merino Crewneck   — a woman in a navy satin dress
-- (both photos were opened and looked at, not guessed from the title).
--
-- The "Men" circle takes its picture from whatever is in Men, so it was
-- showing womenswear under a Men label. Repointing the picture would not help:
-- there is no men's clothing in this category to point it at.
--
-- So the two products move to Women, where their photographs are accurate, and
-- the Men circle disappears on its own — CategoryTab skips a subcategory with
-- no products, the same rule that hides an empty section anywhere else. It
-- comes back the moment a real men's product is added; nothing here needs
-- undoing for that to happen.
--
-- NOT FIXED HERE, because it needs a decision about the catalogue rather than
-- a migration: "Merino Crewneck" is a satin dress in its photograph, and
-- "Everyday Hoodie" is the only one of the two that matches its own title.
-- Those are seed-data errors at the source and are reported, not papered over.

update products p
set subcategory_id = (
  select s.id from subcategories s
  join categories c on c.id = s.category_id
  where c.slug = 'fashion' and s.slug = 'women'
)
where p.title in ('Everyday Hoodie', 'Merino Crewneck')
  and p.category_id = (select id from categories where slug = 'fashion');
