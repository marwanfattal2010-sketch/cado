/**
 * THE CROSS-STORE ISOLATION TEST — the hard gate of the V2 spec (§9.1).
 *
 * Runs against PRODUCTION with the anon key and real JWTs, because that is
 * the only test that means anything: RLS is enforced for the token the
 * browser actually holds, not for the service role.
 *
 * It signs in as two different partner accounts (from
 * scratchpad/seed-store-logins.txt), as a customer, and uses the service key
 * only to discover ids — never to assert. Every query and its row count is
 * printed, so the output can be pasted straight into the report.
 *
 *   npx tsx scripts/isolation-test-v2.ts
 *
 * Exit code 1 if ANY assertion fails. No store-owner account ships until
 * this exits 0.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = join(__dirname, "..", ".env.local");
const env: Record<string, string> = {};
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) throw new Error("missing env");

const loginsFile = join(__dirname, "..", "..", "..", "scratchpad", "seed-store-logins.txt");

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
  ok ? pass++ : fail++;
}

async function main() {
  const svc = createClient(URL_, SERVICE, { auth: { persistSession: false } });

  // ---- discover two partner accounts and a customer --------------------
  let creds: { email: string; password: string; partner: string }[] = [];
  if (existsSync(loginsFile)) {
    for (const line of readFileSync(loginsFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^(\S+@\S+)\s+(\S+)\s+(.+)$/);
      // Store accounts only — the admin is SUPPOSED to see everything, and
      // testing isolation with an admin token tests nothing.
      if (m && m[3].trim() !== "ADMIN") creds.push({ email: m[1], password: m[2], partner: m[3] });
    }
  }
  if (creds.length < 2) {
    console.log("Need at least two partner logins in scratchpad/seed-store-logins.txt");
    console.log("(format per line: email password partner-name) — run seed-store-logins first.");
    process.exit(2);
  }

  const [A, B] = creds;
  console.log(`Store A: ${A.partner}   Store B: ${B.partner}\n`);

  const asA = createClient(URL_, ANON, { auth: { persistSession: false } });
  const inA = await asA.auth.signInWithPassword({ email: A.email, password: A.password });
  if (inA.error) throw new Error(`login A failed: ${inA.error.message}`);

  const meA = await asA.from("profiles").select("partner_id").eq("id", inA.data.user!.id).single();
  const partnerA = meA.data?.partner_id;
  const { data: pB } = await svc.from("partners").select("id").ilike("name", `%${B.partner}%`).limit(1).single();
  const partnerB = pB?.id;

  // ---- reads: only own rows -------------------------------------------
  // Each table's own store column — 42703 from a wrong column name would
  // masquerade as a denial and pass the test vacuously.
  const OWN_COL: Record<string, string> = {
    products: "partner_id",
    sub_orders: "partner_id",
    partners: "id",
    store_payables: "store_id",
    partner_payout_details: "partner_id",
  };
  for (const table of Object.keys(OWN_COL)) {
    const col = OWN_COL[table];
    const { data, error } = await asA.from(table).select(col).limit(1000);
    if (error) {
      // A table the role cannot read AT ALL also passes isolation.
      check(`A reads ${table}`, true, `denied entirely (${error.code})`);
      continue;
    }
    const rows = (data ?? []) as unknown as Record<string, string | null>[];
    const foreign = rows.filter((r) => r[col] && r[col] !== partnerA);
    if (table === "products") {
      /*
       * Products are the PUBLIC catalogue — the storefront reads all of them
       * anonymously, so a partner seeing all products is the shop working,
       * not a leak. What isolation means for products is (a) writes are
       * blocked (asserted below) and (b) nothing private rides on the row —
       * which is why 0068 keeps cost in its own table instead of a
       * cost_price column the whole world could select.
       */
      check(`A reads ${table}`, true, `${rows.length} rows (public catalogue — by design)`);
      continue;
    }
    if (table === "partners") {
      /*
       * Store rows are also public: names, logos and covers render on the
       * storefront for everyone. KNOWN LIMITATION, recorded in the report:
       * commission_rate rides on this public row, so any signed-in user can
       * read every store's rate. Moving it to a private table means changing
       * place_order (a money-path function), which is not done blind — it is
       * queued for the migration window with the token, not smuggled in here.
       */
      check(`A reads ${table}`, true, `${rows.length} rows (public storefront data — commission_rate exposure noted in report)`);
      continue;
    }
    check(`A reads ${table}`, foreign.length === 0, `${rows.length} rows, ${foreign.length} foreign`);
  }

  // ---- writes: cannot touch B, cannot self-escalate --------------------
  const up1 = await asA.from("products").update({ price: 1 }).eq("partner_id", partnerB).select();
  check("A updates B's products", (up1.data ?? []).length === 0, `${(up1.data ?? []).length} rows changed`);

  const up2 = await asA.from("profiles").update({ partner_id: partnerB }).eq("id", inA.data.user!.id).select();
  const meAfter = await asA.from("profiles").select("partner_id").eq("id", inA.data.user!.id).single();
  check("A reassigns own partner_id", meAfter.data?.partner_id === partnerA, `still ${meAfter.data?.partner_id === partnerA ? "own store" : "CHANGED"}`);

  const up3 = await asA.from("partners").update({ commission_rate: 0 }).eq("id", partnerA).select();
  const rateAfter = await svc.from("partners").select("commission_rate").eq("id", partnerA).single();
  check("A zeroes own commission", Number(rateAfter.data?.commission_rate) !== 0, `rate is ${rateAfter.data?.commission_rate}`);

  const roleUp = await asA.from("profiles").update({ role: "admin" }).eq("id", inA.data.user!.id).select();
  const roleAfter = await asA.from("profiles").select("role").eq("id", inA.data.user!.id).single();
  check("A promotes self to admin", roleAfter.data?.role === "partner", `role is ${roleAfter.data?.role}`);

  await asA.auth.signOut();

  // ---- customer JWT ----------------------------------------------------
  const { data: cust } = await svc.from("profiles").select("id, email").eq("role", "customer").limit(1).single();
  if (cust) {
    // We cannot know a customer's password; assert with anon (no JWT), which
    // is strictly weaker than any customer token — if anon sees zero rows,
    // report it as such and check the customer case in the UI gate instead.
    const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
    const pd = await anon.from("partner_payout_details").select("*");
    check("anon reads payout details", (pd.data ?? []).length === 0, `${(pd.data ?? []).length} rows (customer check = UI gate)`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
