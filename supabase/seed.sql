-- Reference data (not demo data — this is the fixed taxonomy the app relies on).
insert into categories (name, slug, icon_name, sort_order) values
  ('Flowers & Gifts', 'flowers-gifts', 'flower', 1),
  ('Fashion & Clothes', 'fashion', 'shirt', 2),
  ('Jewelry & Luxury', 'jewelry-luxury', 'gem', 3),
  ('Beauty & Perfumes', 'beauty-perfumes', 'sparkles', 4),
  ('Kids', 'kids', 'baby', 5),
  ('Chocolate & Food Gifts', 'chocolate-food', 'cake', 6)
on conflict (slug) do nothing;

insert into occasions (name, slug, icon) values
  ('Birthday', 'birthday', 'cake'),
  ('Wedding', 'wedding', 'rings'),
  ('Graduation', 'graduation', 'graduation-cap'),
  ('Anniversary', 'anniversary', 'heart'),
  ('Valentine''s Day', 'valentine', 'heart'),
  ('Newborn', 'newborn', 'baby'),
  ('Housewarming', 'housewarming', 'home'),
  ('Eid', 'eid', 'moon'),
  ('Mother''s Day', 'mothers-day', 'flower')
on conflict (slug) do nothing;
