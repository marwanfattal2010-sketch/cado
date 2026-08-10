/**
 * CROSS-STORE ISOLATION TEST.
 *
 * The single most important guarantee of Stage 1: a store owner can never see
 * another store's data. This test proves it against the LIVE database using the
 * ANON key and a real login — exactly the trust boundary the storefront relies
 * on (RLS is the only authorization layer; there is no API in between).
 *
 * It signs in as the owner of test store A, then for products, order_items,
 * store_payables and store_metrics it asserts:
 *   - zero rows belong to store B (isolation)
 *   - at least one row belongs to store A (positive control — proves the query
 *     works and the "zero" above is real isolation, not an empty/broken query)
 *
 * Depends on seed data. Run:  pnpm --filter @cado/dashboard seed
 *                    then:  pnpm --filter @cado/dashboard test:isolation
 *
 * Uses the anon key, never the service role — the whole point is to test what a
 * real logged-in owner can reach.
 */
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const PASSWORD = "TestOwner!2026";

function uid(label: string): string {
  const h = createHash("sha1").update(`cado-dashboard-seed::${label}`).digest("hex");
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    "4" + h.slice(13, 16),
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

const STORE_A = uid("partner-a");
const STORE_B = uid("partner-b");

let failures = 0;
const log = (s: string) => console.log(s);
function assert(cond: boolean, msg: string) {
  if (cond) log(`  PASS  ${msg}`);
  else {
    log(`  FAIL  ${msg}`);
    failures++;
  }
}

async function main() {
  log(`Store A = ${STORE_A}`);
  log(`Store B = ${STORE_B}`);
  log("");

  const sb = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });

  log("Signing in as owner of store A (test-owner-a@cadotest.local)…");
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: "test-owner-a@cadotest.local",
    password: PASSWORD,
  });
  if (authErr || !auth.user) {
    log(`  Could not sign in: ${authErr?.message ?? "no user"}. Did you run the seed?`);
    process.exit(1);
  }
  log(`  signed in as ${auth.user.id}`);
  log("");

  // Sanity: my_partner_id() resolves to A.
  const mine = await sb.rpc("my_partner_id");
  assert(mine.data === STORE_A, `my_partner_id() returns store A (got ${mine.data})`);
  log("");

  // ---- products ----
  //
  // Read the scope of this one carefully, because it is easy to over-claim.
  //
  // The product CATALOG is deliberately public: "public reads active products"
  // has qual (is_active OR partner_id = my_partner_id() OR is_admin()), and it
  // has to, because cado-web serves anonymous shoppers straight from this table.
  // So "store A cannot see store B's products" is NOT true in general and must
  // never be asserted — any active product is readable by anyone, logged in or
  // not. That is the storefront working as designed, not a leak.
  //
  // What is genuinely private, and what is therefore tested here:
  //   1. UNPUBLISHED products (is_active = false) — a store's unreleased or
  //      withdrawn catalogue must not leak to a competitor. Every seeded test
  //      product is inactive, so store B's rows are exactly this case.
  //   2. WRITE access — store A must not be able to edit or delete store B's
  //      products. This holds regardless of is_active and is the stronger claim.
  log("products:");
  {
    const all = await sb.from("products").select("id, partner_id");
    const rows = all.data ?? [];
    const a = rows.filter((r) => r.partner_id === STORE_A).length;
    const b = rows.filter((r) => r.partner_id === STORE_B).length;
    const targeted = await sb.from("products").select("id").eq("partner_id", STORE_B);
    assert(a > 0, `sees its own (unpublished) products (${a} rows)`);
    assert(b === 0, `sees ZERO of store B's unpublished products via broad select`);
    assert((targeted.data ?? []).length === 0, `sees ZERO when explicitly querying partner_id = B`);

    // Write isolation — the claim that holds even for a published product.
    const victim = uid("product-b-0");
    const upd = await sb.from("products").update({ title: "PWNED BY STORE A" }).eq("id", victim).select();
    const updBlocked = !!upd.error || (upd.data ?? []).length === 0;
    assert(updBlocked, `cannot UPDATE store B's product (${upd.error ? upd.error.message.slice(0, 50) : "0 rows affected"})`);

    const del = await sb.from("products").delete().eq("id", victim).select();
    const delBlocked = !!del.error || (del.data ?? []).length === 0;
    assert(delBlocked, `cannot DELETE store B's product (${del.error ? del.error.message.slice(0, 50) : "0 rows affected"})`);
  }
  log("");

  // ---- order_items ----
  log("order_items:");
  {
    const all = await sb
      .from("order_items")
      .select("id, sub_order_id, sub_orders!inner(partner_id)");
    // PostgREST returns the embedded row as an object here, but the generated
    // types model it as an array. Normalise instead of asserting a shape.
    const rows = (all.data ?? []) as unknown as Array<{
      sub_orders: { partner_id: string } | { partner_id: string }[] | null;
    }>;
    const partnerOf = (r: (typeof rows)[number]) =>
      Array.isArray(r.sub_orders) ? r.sub_orders[0]?.partner_id : r.sub_orders?.partner_id;
    const a = rows.filter((r) => partnerOf(r) === STORE_A).length;
    const b = rows.filter((r) => partnerOf(r) === STORE_B).length;
    // If this positive control fails, the isolation assertion below is
    // meaningless rather than reassuring — see 0035. Say so out loud.
    assert(a > 0, `sees its own order items (${a} rows)`);
    if (a === 0) log("        ^ isolation for this table is UNPROVEN, not passing");
    assert(b === 0, `sees ZERO of store B's order items`);
  }
  log("");

  // ---- store_payables ----
  log("store_payables:");
  {
    const all = await sb.from("store_payables").select("id, store_id");
    const rows = all.data ?? [];
    const a = rows.filter((r) => r.store_id === STORE_A).length;
    const b = rows.filter((r) => r.store_id === STORE_B).length;
    const targeted = await sb.from("store_payables").select("id").eq("store_id", STORE_B);
    assert(a > 0, `sees its own payables (${a} rows)`);
    assert(b === 0, `sees ZERO of store B's payables via broad select`);
    assert((targeted.data ?? []).length === 0, `sees ZERO when explicitly querying store_id = B`);
  }
  log("");

  // ---- store_metrics ----
  log("store_metrics:");
  {
    const all = await sb.from("store_metrics").select("partner_id, day");
    const rows = all.data ?? [];
    const a = rows.filter((r) => r.partner_id === STORE_A).length;
    const b = rows.filter((r) => r.partner_id === STORE_B).length;
    assert(a > 0, `sees its own metrics (${a} day-rows)`);
    assert(b === 0, `sees ZERO of store B's metrics`);
  }
  log("");

  // ---- sub_orders (delivery data) ----
  //
  // The positive control here is not optional. This table originally asserted
  // only the "zero of store B" half, and that is how the order_items bug fixed
  // in 0035 survived: when a query returns nothing for ANYONE, "sees zero of
  // store B" passes for the wrong reason. Every table below must prove it can
  // see its own rows before its isolation claim means anything.
  log("sub_orders:");
  {
    const all = await sb.from("sub_orders").select("id, partner_id");
    const rows = all.data ?? [];
    const a = rows.filter((r) => r.partner_id === STORE_A).length;
    const b = rows.filter((r) => r.partner_id === STORE_B).length;
    const targeted = await sb.from("sub_orders").select("id").eq("partner_id", STORE_B);
    assert(a > 0, `sees its own sub_orders (${a} rows)`);
    assert(b === 0, `sees ZERO of store B's sub_orders`);
    assert((targeted.data ?? []).length === 0, `sees ZERO when explicitly querying partner_id = B`);
  }
  log("");

  // ---- privilege columns cannot be self-escalated (0026 / 0031) ----
  log("privilege lockdown:");
  {
    // Try to zero out my own commission_rate — must be blocked by the trigger.
    const res = await sb.from("partners").update({ commission_rate: 0 }).eq("id", STORE_A).select();
    const blocked = !!res.error || (res.data ?? []).length === 0;
    assert(blocked, `cannot change own commission_rate (${res.error ? res.error.message.slice(0, 60) : "no row updated"})`);

    // Try to grant myself store B via my profile partner_id — must be blocked.
    const res2 = await sb
      .from("profiles")
      .update({ partner_id: STORE_B })
      .eq("id", auth.user.id)
      .select();
    const blocked2 = !!res2.error || (res2.data ?? []).length === 0;
    assert(blocked2, `cannot reassign own partner_id to store B`);
  }
  log("");

  await sb.auth.signOut();

  log("========================================");
  if (failures === 0) {
    log("RESULT: all isolation assertions PASSED");
    process.exit(0);
  } else {
    log(`RESULT: ${failures} assertion(s) FAILED`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
