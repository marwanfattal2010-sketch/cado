-- 0073: per-store money for a date range, computed in Postgres.
--
-- /admin/finance queried order_items directly and summed line_total in React.
-- Two things wrong with that, and the second hid the first:
--
--   1. Migration 0020 deliberately dropped "admin full access to orders" and
--      the matching sub_orders policy. An admin selecting from order_items
--      through PostgREST therefore gets ZERO ROWS — not an error, not a denial,
--      just an empty array. The page rendered "No sales in this range" while
--      the payables ledger directly beneath it listed that same range's sales.
--      A revenue screen reading $0 is the worst possible failure mode: it looks
--      like a quiet business rather than a broken query.
--
--   2. The totals were summed in the browser, which the project forbids for
--      exactly this reason — a money figure should come from one place that
--      can be checked, not from whatever subset of rows a query happened to
--      return.
--
-- admin_finance_breakdown() (0068) already answers "per day". This is the
-- per-store companion, same guard, same snapshot discipline: it reads
-- commission_amount_snapshot and line_total as they were stored when the order
-- was placed, so changing a store's rate today never rewrites what it earned
-- last month. Cancelled sub-orders are excluded from sales and reported
-- separately rather than silently dropped.

create or replace function admin_finance_by_store(p_from date, p_to date)
returns table (
  partner_id uuid,
  name text,
  orders bigint,
  sales numeric,
  commission numeric,
  payable numeric,
  cancelled numeric
)
language sql stable security definer set search_path = public as $$
  select
    pa.id,
    pa.name,
    count(distinct so.id) filter (where so.status <> 'cancelled') as orders,
    coalesce(sum(oi.line_total) filter (where so.status <> 'cancelled'), 0) as sales,
    coalesce(sum(oi.commission_amount_snapshot) filter (where so.status <> 'cancelled'), 0) as commission,
    coalesce(sum(oi.line_total - coalesce(oi.commission_amount_snapshot, 0))
             filter (where so.status <> 'cancelled'), 0) as payable,
    coalesce(sum(oi.line_total) filter (where so.status = 'cancelled'), 0) as cancelled
  from order_items oi
  join sub_orders so on so.id = oi.sub_order_id
  join orders ord on ord.id = so.order_id
  join partners pa on pa.id = so.partner_id
  where ord.created_at >= p_from
    and ord.created_at < p_to + 1
    and is_admin()
  group by pa.id, pa.name
  having coalesce(sum(oi.line_total), 0) <> 0
  order by sales desc
$$;

revoke all on function admin_finance_by_store(date, date) from public, anon;
grant execute on function admin_finance_by_store(date, date) to authenticated;

comment on function admin_finance_by_store(date, date) is
  'Per-store sales/commission/payable for a date range, from order_items snapshots. Exists because admins cannot read order_items directly (0020) and money must not be summed in the browser.';
