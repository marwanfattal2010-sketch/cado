-- Subcategories: lets Fashion split into Men/Women/Kids/Shoes/Accessories, etc.
create table subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (category_id, slug)
);

create index subcategories_category_idx on subcategories (category_id);

alter table subcategories enable row level security;
create policy "public reads subcategories" on subcategories for select using (true);
create policy "admin writes subcategories" on subcategories for all using (is_admin()) with check (is_admin());

alter table products add column subcategory_id uuid references subcategories(id) on delete set null;
create index products_subcategory_idx on products (subcategory_id);
