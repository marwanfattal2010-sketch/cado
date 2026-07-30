-- get_gift_recommendations: rules-based recommendation with cascading fallback.
-- Recipient is never dropped (strongest signal); budget then occasion relax in that order.
create or replace function get_gift_recommendations(
  p_recipient text,
  p_occasion text,
  p_budget_min numeric,
  p_budget_max numeric
) returns setof products
language plpgsql stable as $$
begin
  return query select * from products
    where is_active
      and recipient_tags && array[p_recipient]
      and occasion_tags && array[p_occasion]
      and price between p_budget_min and p_budget_max
    order by is_featured desc, avg_rating desc nulls last
    limit 20;
  if found then return; end if;

  return query select * from products
    where is_active
      and recipient_tags && array[p_recipient]
      and occasion_tags && array[p_occasion]
      and price <= p_budget_max * 1.5
    order by is_featured desc
    limit 20;
  if found then return; end if;

  return query select * from products
    where is_active
      and recipient_tags && array[p_recipient]
      and price between p_budget_min and p_budget_max
    order by is_featured desc
    limit 20;
  if found then return; end if;

  return query select * from products
    where is_active and recipient_tags && array[p_recipient]
    order by is_trending desc, is_featured desc
    limit 20;
end;
$$;

grant execute on function get_gift_recommendations(text, text, numeric, numeric) to anon, authenticated;
