/**
 * Place ONE test order against a real store, exactly the way the storefront
 * does it: sign in as the test customer with the ANON key, put a product in
 * the cart, call place_order(). No service-role shortcuts on the money path —
 * if the checkout guardrails (rate limit, inactive-product trigger, RLS)
 * would block a real customer, they must block this too.
 *
 * Usage: npx tsx scripts/place-test-order.ts <partner-slug-fragment>
 */
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const storeFragment = process.argv[2] ?? "beirut-blooms";

  // Service role ONLY to look up ids and ensure an address exists — never to
  // write order data.
  const svc = createClient(URL, SERVICE, { auth: { persistSession: false } });

  const { data: partner } = await svc
    .from("partners")
    .select("id, name, slug")
    .ilike("slug", `%${storeFragment}%`)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!partner) throw new Error(`no active partner matching ${storeFragment}`);

  const { data: product } = await svc
    .from("products")
    .select("id, title, price, stock_quantity")
    .eq("partner_id", partner.id)
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .order("price")
    .limit(1)
    .maybeSingle();
  if (!product) throw new Error(`no active in-stock product for ${partner.name}`);

  const sb = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: "test-customer@cadotest.local",
    password: "TestOwner!2026",
  });
  if (authErr || !auth.user) throw new Error(`customer sign-in failed: ${authErr?.message}`);

  const { data: address } = await sb.from("addresses").select("id").limit(1).maybeSingle();
  if (!address) throw new Error("test customer has no address (seed should have made one)");

  // Fresh cart: exactly one line.
  await sb.from("cart_items").delete().eq("profile_id", auth.user.id);
  const { error: cartErr } = await sb
    .from("cart_items")
    .insert({ profile_id: auth.user.id, product_id: product.id, quantity: 1 });
  if (cartErr) throw new Error(`cart insert failed: ${cartErr.message}`);

  console.log(`Placing order: 1× "${product.title}" ($${product.price}) from ${partner.name}…`);
  const { data: orderId, error: orderErr } = await sb.rpc("place_order", {
    p_delivery_address_id: address.id,
    p_delivery_date: new Date().toISOString().slice(0, 10),
    p_delivery_time_slot: "6PM - 9PM",
    p_notes: "[TEST ORDER] dashboard confirm-flow verification",
    p_gift_card_code: null,
    p_payment_method: "cod",
    p_is_gift: false,
    p_recipient_name: "[TEST] Recipient",
    p_recipient_phone: "+96170000000",
    p_address_source: "buyer",
    p_hide_price: false,
    p_gift_message: null,
  });
  if (orderErr) throw new Error(`place_order failed: ${orderErr.message}`);

  const { data: order } = await sb
    .from("orders")
    .select("order_number, total, sub_orders(id, partner_id, status)")
    .eq("id", orderId as unknown as string)
    .single();

  console.log(
    JSON.stringify(
      { orderId, order_number: order?.order_number, total: order?.total, sub_orders: order?.sub_orders },
      null,
      2
    )
  );
  await sb.auth.signOut();
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
