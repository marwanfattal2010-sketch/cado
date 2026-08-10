/**
 * Why can store A not see its own order_items?
 *
 * The isolation test's only failure was a POSITIVE control: store A saw zero of
 * its own order lines. That makes the matching "sees zero of store B" assertion
 * meaningless, so this has to be understood before the isolation result can be
 * trusted for that table.
 *
 * The 0020 SELECT policy on order_items does include
 * `so.partner_id = my_partner_id()`, so the row filter looks right. But that
 * policy reaches order_items THROUGH sub_orders, and a policy subquery is
 * itself subject to the referenced table's RLS. So if store A cannot read its
 * own sub_orders, order_items goes dark too — and the isolation test never
 * positive-controlled sub_orders.
 *
 * Compares what the service role can see (ground truth) with what store A's own
 * logged-in session can see, table by table. Writes nothing.
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
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = "TestOwner!2026";

function uid(label: string): string {
  const h = createHash("sha1").update(`cado-dashboard-seed::${label}`).digest("hex");
  return [h.slice(0, 8), h.slice(8, 12), "4" + h.slice(13, 16),
    ((parseInt(h.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32)].join("-");
}
const STORE_A = uid("partner-a");

async function main() {
  const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const sb = createClient(URL, ANON, { auth: { persistSession: false } });

  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: "test-owner-a@cadotest.local",
    password: PASSWORD,
  });
  if (authErr || !auth.user) throw new Error(`sign-in failed: ${authErr?.message}`);
  console.log(`signed in as ${auth.user.id} (store A = ${STORE_A})\n`);

  // Ground truth, bypassing RLS.
  const truthSubs = await svc.from("sub_orders").select("id").eq("partner_id", STORE_A);
  const subIds = (truthSubs.data ?? []).map((r) => r.id);
  const truthItems = await svc.from("order_items").select("id", { count: "exact", head: true }).in("sub_order_id", subIds);
  console.log("GROUND TRUTH (service role, RLS bypassed):");
  console.log(`  sub_orders for store A : ${subIds.length}`);
  console.log(`  order_items for store A: ${truthItems.count}`);
  console.log("");

  // What the owner's own session can actually reach.
  console.log("AS THE STORE OWNER (anon key + real login, RLS enforced):");

  const prof = await sb.from("profiles").select("id, role, partner_id").eq("id", auth.user.id).maybeSingle();
  console.log(`  own profile          : role=${prof.data?.role} partner_id=${prof.data?.partner_id}`);

  const rpcPartner = await sb.rpc("my_partner_id");
  console.log(`  my_partner_id()      : ${rpcPartner.data}`);
  const rpcIsOwner = await sb.rpc("is_store_owner");
  console.log(`  is_store_owner()     : ${rpcIsOwner.data} ${rpcIsOwner.error ? `(${rpcIsOwner.error.message})` : ""}`);
  console.log("");

  const ownSubs = await sb.from("sub_orders").select("id, partner_id, status");
  console.log(`  sub_orders visible   : ${ownSubs.data?.length ?? 0} ${ownSubs.error ? `ERROR ${ownSubs.error.message}` : ""}`);

  const ownSubsScoped = await sb.from("sub_orders").select("id").eq("partner_id", STORE_A);
  console.log(`  sub_orders where A   : ${ownSubsScoped.data?.length ?? 0} ${ownSubsScoped.error ? `ERROR ${ownSubsScoped.error.message}` : ""}`);

  const itemsFlat = await sb.from("order_items").select("id, sub_order_id");
  console.log(`  order_items (flat)   : ${itemsFlat.data?.length ?? 0} ${itemsFlat.error ? `ERROR ${itemsFlat.error.message}` : ""}`);

  const itemsScoped = await sb.from("order_items").select("id").in("sub_order_id", subIds.slice(0, 50));
  console.log(`  order_items in A subs: ${itemsScoped.data?.length ?? 0} ${itemsScoped.error ? `ERROR ${itemsScoped.error.message}` : ""}`);

  const ordersVisible = await sb.from("orders").select("id");
  console.log(`  orders visible       : ${ordersVisible.data?.length ?? 0} ${ordersVisible.error ? `ERROR ${ordersVisible.error.message}` : ""}`);
  console.log("");

  console.log("READING:");
  if ((ownSubs.data?.length ?? 0) === 0) {
    console.log("  sub_orders is dark for its own partner. order_items reaches its");
    console.log("  partner branch THROUGH sub_orders, so that is the root cause and");
    console.log("  order_items is only a symptom.");
  } else if ((itemsFlat.data?.length ?? 0) === 0) {
    console.log("  sub_orders is visible but order_items is not — the fault is in the");
    console.log("  order_items SELECT policy itself, not the join.");
  } else {
    console.log("  both visible — the isolation test's join syntax was the problem.");
  }

  await sb.auth.signOut();
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
