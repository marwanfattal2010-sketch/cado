-- 0080: CADO's commercial terms stop being world-readable.
--
-- `partners` is public on purpose — the storefront lists shops to logged-out
-- visitors. But the same table carries things that are nobody's business but
-- CADO's and the shop's:
--
--   commission_rate    what CADO takes from that shop
--   pickup_address     where a driver collects (internal logistics)
--   driver_contact     the shop's dispatch number
--   email, phone       the owner's own contact details
--   application_text   what they wrote when applying
--   rejection_reason   why CADO said no
--
-- The anon key is embedded in the storefront's JavaScript, so "public" here
-- means anyone on the internet with two minutes. Every rate is 0.15 today, so
-- nothing is exposed yet — but the first shop that negotiates a different deal
-- makes this a live commercial leak, and any shop could look up what another
-- one got.
--
-- RLS cannot fix it: a row policy has no idea which COLUMNS were asked for
-- (the same limitation 0072 dealt with on reviews). Column privileges can, so
-- the anon role simply loses the right to select these.
--
-- SCOPE, and what is deliberately left: this revokes from `anon` only. Postgres
-- column grants are per ROLE, and a CADO admin and a shopper are both
-- `authenticated` — so revoking there too would break the dashboard's own store
-- pages while only inconveniencing a signed-in snooper. Closing that properly
-- means moving these columns behind SECURITY DEFINER reads, which is a bigger
-- change than belongs at the end of this batch. Recorded, not hidden.
--
-- SAFETY: apps/web/src/hooks/useStores.ts selected `*` from partners, which
-- would start failing the moment a column is revoked. That query was changed to
-- an explicit column list in the same commit as this migration. No other
-- storefront query touches these columns — all of them name their columns.

revoke select (
  commission_rate,
  pickup_address,
  driver_contact,
  email,
  phone,
  application_text,
  rejection_reason,
  reviewed_by,
  reviewed_at,
  applied_at,
  is_demo
) on partners from anon;

comment on column partners.commission_rate is
  'CADO''s cut for this store. NOT readable by the anon role (0080) — it is a commercial term, and the anon key ships in the storefront bundle.';
