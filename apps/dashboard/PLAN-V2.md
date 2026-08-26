# Dashboard V2 — what exists vs what the spec needs (recon log, Aug 25 2026)

## Already real (verified against production)
- Roles on profiles: `admin` (2), `partner` (9), `customer` (4). THE STORE ROLE
  IS `partner`, not `store_owner` — every policy in 0032/0033 keys on it, so
  V2 keeps the name and the spec's `store_owner` is read as `partner`.
- 0031–0033 delivered: product_variants, order_events (audit trail),
  notifications (with the exact shape §8 asks for), payout_periods,
  store_metrics, store_owner_invites, commission snapshots on order_items,
  per-item confirmation_status, partner_order_context(), rebuild_store_metrics().
- partners already has: status (active/pending), is_live, commission_rate,
  tagline, is_featured, featured_rank, offers_gift_wrap (spec's
  gift_wrap_available — existing name kept).
- products already has: compare_at_price, is_featured, occasion/recipient tags.
- Existing app: login w/ role routing, admin (overview/orders/products/stores/
  invites/settings), store (overview/orders w/ per-item confirm/products/
  payouts/account). Server-actions based, cream+persimmon theme already.

## Missing (this build)
- Tables: settings, drivers, deliveries, support_tickets, support_replies,
  reviews, partner_payout_details, payout_statements, product_hashtags,
  store_applications (as columns on partners — simpler, one row per store).
- Columns: partners.{pickup_address,driver_contact,is_demo,store_of_week,
  application_text,applied_at,reviewed_by,reviewed_at,rejection_reason},
  profiles.store_role, products.{review_status,cost_price},
  store_payables.{statement_id,paid_at,paid_method,paid_reference}.
- Admin finance/gift-card SECURITY DEFINER readers.
- UI: full IA of §3, KpiCard/DataTable/etc, store switcher, cmd-K, realtime.

## Defaults chosen without asking (spec told me to)
- store_owner role name → existing `partner`.
- gift_wrap_available → existing `offers_gift_wrap`.
- Applications live on `partners` columns, not a separate table: an
  application IS a pending partner row here, and one row can't drift from
  itself.
- reviews.order_item_id unique ⇒ one review per purchased item, exactly §11.8.
