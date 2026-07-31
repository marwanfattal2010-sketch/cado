-- Restructure top-level categories: rename Kids->Toys, Beauty & Perfumes->Perfumes,
-- split Shoes out of Fashion into its own category, add Home & Gifts (mugs etc),
-- and reorder to: Fashion & Clothes, Shoes, Toys, Perfumes, Chocolate & Food Gifts,
-- Jewelry & Luxury, Home & Gifts, Flowers & Gifts.

update categories set name = 'Toys', slug = 'toys', sort_order = 3 where slug = 'kids';
update categories set name = 'Perfumes', slug = 'perfumes', sort_order = 4 where slug = 'beauty-perfumes';
update categories set sort_order = 1 where slug = 'fashion';
update categories set sort_order = 5 where slug = 'chocolate-food';
update categories set sort_order = 6 where slug = 'jewelry-luxury';
update categories set sort_order = 8 where slug = 'flowers-gifts';

insert into categories (name, slug, sort_order)
values ('Shoes', 'shoes', 2)
on conflict (slug) do update set sort_order = excluded.sort_order;

insert into categories (name, slug, sort_order)
values ('Home & Gifts', 'home-gifts', 7)
on conflict (slug) do update set sort_order = excluded.sort_order;

-- Move any products tagged with the old "Shoes" subcategory under Fashion into the new top-level Shoes category.
update products set category_id = (select id from categories where slug = 'shoes'), subcategory_id = null
where subcategory_id in (
  select s.id from subcategories s
  join categories c on c.id = s.category_id
  where c.slug = 'fashion' and s.slug = 'shoes'
);
