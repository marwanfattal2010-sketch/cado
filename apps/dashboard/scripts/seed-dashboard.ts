/**
 * Dashboard Stage 1 seed — ADDITIVE and REVERSIBLE.
 *
 * The live database already holds real partners, products and orders. This
 * script never touches them. It creates a clearly-marked parallel set of TEST
 * rows (store names prefixed "[TEST]", emails @cadotest.local) and records
 * every row it inserts in dashboard_seed_registry so `--teardown` can remove
 * exactly what it added and nothing else.
 *
 * Idempotent: all business rows use deterministic UUIDs and are upserted;
 * auth users are looked up by email and created only if missing; seeded orders
 * are torn down and rebuilt on each run. Running it twice equals running once.
 *
 * Seeds: 1 admin (the existing project owner is left as-is; we mark a test
 * admin too), 4 stores, 4 owners (known passwords, for the isolation test),
 * ~40 products with variants, and sub_orders covering every status.
 *
 * Run:  pnpm --filter @cado/dashboard seed
 *       pnpm --filter @cado/dashboard seed:teardown
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in
 * apps/dashboard/.env.local (already gitignored). The key is never printed.
 */
import { createHash } from "node:crypto";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !SERVICE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/dashboard/.env.local");
  process.exit(1);
}

const db = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const BATCH = "dashboard_stage1_seed";
const OWNER_PASSWORD = "TestOwner!2026"; // test-only credential, documented in the report
const TEARDOWN = process.argv.includes("--teardown");

/** Deterministic UUID from a label so re-runs are stable. */
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

const registry: Array<{ table_name: string; record_id: string }> = [];
function track(table_name: string, record_id: string) {
  registry.push({ table_name, record_id });
}

const STORES = [
  { key: "a", name: "[TEST] Aurora Atelier", commission: 0.15 },
  { key: "b", name: "[TEST] Brass & Bloom", commission: 0.2 },
  { key: "c", name: "[TEST] Cedar Loft", commission: 0.1 },
  { key: "d", name: "[TEST] Dune & Dusk", commission: 0.18 },
];
const SUB_ORDER_STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

async function findAuthUserByEmail(email: string) {
  // listUsers is paginated; walk pages until found or exhausted.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureAuthUser(email: string, password: string) {
  const existing = await findAuthUserByEmail(email);
  if (existing) {
    // keep the password in sync so the isolation test can always log in
    await db.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    return existing.id;
  }
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user.id;
}

async function teardown() {
  console.log("Tearing down seed batch:", BATCH);
  const { data: rows, error } = await db
    .from("dashboard_seed_registry")
    .select("table_name, record_id")
    .eq("batch", BATCH);
  if (error) throw error;

  // Delete children before parents.
  const order = [
    "store_payables",
    "order_items",
    "order_events",
    "sub_orders",
    "orders",
    "addresses",
    "product_variants",
    "products",
    "store_owner_invites",
    "profiles",
    "partners",
    "auth.users",
  ];
  const byTable = new Map<string, string[]>();
  for (const r of rows ?? []) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, []);
    byTable.get(r.table_name)!.push(r.record_id);
  }

  for (const table of order) {
    const ids = byTable.get(table);
    if (!ids?.length) continue;
    if (table === "auth.users") {
      for (const id of ids) {
        await db.auth.admin.deleteUser(id).catch(() => {});
      }
      console.log(`  deleted ${ids.length} auth users`);
      continue;
    }
    if (table === "order_events") continue; // append-only + cascades from sub_orders
    const pk = table === "store_metrics" ? "partner_id" : "id";
    const { error: delErr } = await db.from(table).delete().in(pk, ids);
    if (delErr) console.warn(`  ${table}: ${delErr.message}`);
    else console.log(`  deleted ${ids.length} from ${table}`);
  }

  await db.from("dashboard_seed_registry").delete().eq("batch", BATCH);
  console.log("Teardown complete.");
}

async function seed() {
  // Rebuild orders cleanly each run: remove previously-seeded order graph so we
  // don't accumulate duplicates, but keep stores/products/owners stable.
  const { data: prevOrders } = await db
    .from("dashboard_seed_registry")
    .select("record_id")
    .eq("batch", BATCH)
    .eq("table_name", "orders");
  if (prevOrders?.length) {
    const orderIds = prevOrders.map((r) => r.record_id);
    const { data: subs } = await db.from("sub_orders").select("id").in("order_id", orderIds);
    const subIds = (subs ?? []).map((s) => s.id);
    if (subIds.length) {
      await db.from("store_payables").delete().in("order_id", orderIds);
      await db.from("order_items").delete().in("sub_order_id", subIds);
      await db.from("sub_orders").delete().in("id", subIds);
    }
    await db.from("orders").delete().in("id", orderIds);
    await db
      .from("dashboard_seed_registry")
      .delete()
      .eq("batch", BATCH)
      .in("table_name", ["orders", "sub_orders", "order_items", "store_payables"]);
  }

  const categoryRes = await db.from("categories").select("id").eq("is_active", true).limit(1).single();
  if (categoryRes.error) throw categoryRes.error;
  const categoryId = categoryRes.data.id;

  // --- stores + owners -------------------------------------------------------
  const storeIds: Record<string, string> = {};
  const ownerIds: Record<string, string> = {};

  for (const s of STORES) {
    const id = uid(`partner-${s.key}`);
    storeIds[s.key] = id;
    const slug = `zzz-test-store-${s.key}`;
    const { error } = await db.from("partners").upsert(
      {
        id,
        name: s.name,
        slug,
        status: "active",
        commission_rate: s.commission,
        country: "LB",
        city: "Beirut",
        confirmation_timeout_minutes: 60,
      },
      { onConflict: "id" }
    );
    if (error) throw error;
    track("partners", id);

    const email = `test-owner-${s.key}@cadotest.local`;
    const ownerId = await ensureAuthUser(email, OWNER_PASSWORD);
    ownerIds[s.key] = ownerId;
    track("auth.users", ownerId);

    const { error: profErr } = await db
      .from("profiles")
      .upsert({ id: ownerId, full_name: `${s.name} Owner`, role: "partner", partner_id: id }, { onConflict: "id" });
    if (profErr) throw profErr;
    track("profiles", ownerId);
  }

  // --- a test customer -------------------------------------------------------
  const customerId = await ensureAuthUser("test-customer@cadotest.local", OWNER_PASSWORD);
  track("auth.users", customerId);
  await db.from("profiles").upsert({ id: customerId, full_name: "[TEST] Customer", role: "customer" }, { onConflict: "id" });
  track("profiles", customerId);

  const addrId = uid("addr-customer");
  await db.from("addresses").upsert(
    {
      id: addrId,
      profile_id: customerId,
      label: "Home",
      recipient_name: "[TEST] Recipient",
      phone: "+9611234567",
      country: "LB",
      city: "Beirut",
      area: "Hamra",
      street: "Test Street 1",
    },
    { onConflict: "id" }
  );
  track("addresses", addrId);

  // --- products + variants (10 per store = 40) -------------------------------
  for (const s of STORES) {
    for (let i = 0; i < 10; i++) {
      const pid = uid(`product-${s.key}-${i}`);
      const { error } = await db.from("products").upsert(
        {
          id: pid,
          partner_id: storeIds[s.key],
          category_id: categoryId,
          title: `[TEST] ${s.name.replace("[TEST] ", "")} Item ${i + 1}`,
          slug: `zzz-test-${s.key}-${i}`,
          price: 20 + i * 5,
          currency: "USD",
          stock_quantity: 25,
          is_active: i !== 9, // one hidden product per store to exercise that state
        },
        { onConflict: "id" }
      );
      if (error) throw error;
      track("products", pid);

      // first three products in each store get two variants
      if (i < 3) {
        for (const [vi, vname] of ["Small", "Large"].entries()) {
          const vid = uid(`variant-${s.key}-${i}-${vi}`);
          await db.from("product_variants").upsert(
            {
              id: vid,
              product_id: pid,
              name: vname,
              price_delta: vi === 1 ? 5 : 0,
              stock_quantity: 10,
              sort_order: vi,
            },
            { onConflict: "id" }
          );
          track("product_variants", vid);
        }
      }
    }
  }

  // --- orders covering every status, per store -------------------------------
  let orderSeq = 0;
  for (const s of STORES) {
    for (const status of SUB_ORDER_STATUSES) {
      orderSeq++;
      const oid = uid(`order-${s.key}-${status}`);
      const soid = uid(`suborder-${s.key}-${status}`);
      const p0 = uid(`product-${s.key}-0`);
      const p1 = uid(`product-${s.key}-1`);
      const unit0 = 20,
        qty0 = 2,
        line0 = unit0 * qty0;
      const unit1 = 25,
        qty1 = 1,
        line1 = unit1 * qty1;
      const subtotal = line0 + line1;
      const deliveryFee = 5;
      const total = subtotal + deliveryFee;

      await db.from("orders").upsert(
        {
          id: oid,
          order_number: `TEST-${String(orderSeq).padStart(4, "0")}`,
          customer_id: customerId,
          delivery_address_id: addrId,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          payment_method: "cod",
          payment_status: status === "delivered" ? "paid" : "unpaid",
          is_gift: true,
          recipient_name: "[TEST] Recipient",
          recipient_phone: "+9611234567",
        },
        { onConflict: "id" }
      );
      track("orders", oid);

      await db.from("sub_orders").upsert(
        {
          id: soid,
          order_id: oid,
          partner_id: storeIds[s.key],
          status,
          subtotal,
          delivery_fee: deliveryFee,
          total,
        },
        { onConflict: "id" }
      );
      track("sub_orders", soid);

      // two line items; vary confirmation status a little
      const it0 = uid(`item-${s.key}-${status}-0`);
      const it1 = uid(`item-${s.key}-${status}-1`);
      const confirmed = ["accepted", "preparing", "ready", "out_for_delivery", "delivered"].includes(status);
      await db.from("order_items").upsert(
        {
          id: it0,
          sub_order_id: soid,
          product_id: p0,
          product_title_snapshot: `[TEST] ${s.name} Item 1`,
          unit_price_snapshot: unit0,
          quantity: qty0,
          line_total: line0,
          confirmation_status: confirmed ? "confirmed" : status === "cancelled" ? "rejected" : "pending",
          confirmed_at: confirmed ? new Date().toISOString() : null,
        },
        { onConflict: "id" }
      );
      track("order_items", it0);
      await db.from("order_items").upsert(
        {
          id: it1,
          sub_order_id: soid,
          product_id: p1,
          product_title_snapshot: `[TEST] ${s.name} Item 2`,
          unit_price_snapshot: unit1,
          quantity: qty1,
          line_total: line1,
          confirmation_status: confirmed ? "confirmed" : "pending",
          confirmed_at: confirmed ? new Date().toISOString() : null,
        },
        { onConflict: "id" }
      );
      track("order_items", it1);

      // a payable for delivered orders (mirrors what place_order would accrue)
      if (status === "delivered") {
        const payId = uid(`payable-${s.key}-${status}`);
        const commissionRate = s.commission;
        const gross = subtotal;
        const commission = Math.round(gross * commissionRate * 100) / 100;
        await db.from("store_payables").upsert(
          {
            id: payId,
            store_id: storeIds[s.key],
            order_id: oid,
            gross_amount: gross,
            commission_rate: commissionRate,
            commission_amount: commission,
            net_owed: Math.round((gross - commission) * 100) / 100,
            status: "pending",
          },
          { onConflict: "id" }
        );
        track("store_payables", payId);
      }
    }
  }

  // Register everything, then rebuild metrics for each test store.
  // Upsert registry (unique on table_name+record_id).
  for (let i = 0; i < registry.length; i += 500) {
    const chunk = registry.slice(i, i + 500).map((r) => ({ batch: BATCH, ...r }));
    const { error } = await db.from("dashboard_seed_registry").upsert(chunk, { onConflict: "table_name,record_id" });
    if (error) throw error;
  }

  for (const s of STORES) {
    await db.rpc("rebuild_store_metrics", { p_partner_id: storeIds[s.key] });
  }

  console.log("Seed complete.");
  console.log("  4 stores, 4 owners, 40 products, variants, orders in every status.");
  console.log("  Owner logins (password for ALL test accounts:", OWNER_PASSWORD + "):");
  for (const s of STORES) {
    console.log(`    ${s.name}: test-owner-${s.key}@cadotest.local -> partner ${storeIds[s.key]}`);
  }
  console.log("  Test customer: test-customer@cadotest.local");
}

(async () => {
  try {
    if (TEARDOWN) await teardown();
    else await seed();
  } catch (e) {
    console.error("FAILED:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
})();
