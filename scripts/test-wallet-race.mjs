/**
 * Proves one gift card code cannot be redeemed twice.
 *
 * The same standard task 1 was held to: "the button is disabled while
 * pending" is not a fix — that is the browser, and the browser is not the
 * boundary. Two redemptions of one code are fired AT THE SAME INSTANT and
 * the money must land exactly once.
 *
 * HOW THE CONCURRENCY IS REAL. Each redemption is its own HTTP request to
 * the Supabase SQL endpoint, so each runs in its own database session and
 * its own transaction. Promise.all starts both before either finishes.
 * Without the `select ... for update` inside redeem_gift_card_to_wallet,
 * both would read a balance of 40 before either committed and the wallet
 * would gain 80 for one card.
 *
 * `request.jwt.claims` is set inside each transaction so auth.uid() returns
 * a real user — a service-role connection has no `sub`, and the function
 * correctly refuses an anonymous caller.
 *
 * Usage: SUPABASE_ACCESS_TOKEN=... node scripts/test-wallet-race.mjs [code]
 */
const PROJECT_REF = "tzuntmerjhegkzsbfmnf";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("SUPABASE_ACCESS_TOKEN is not set.");
  process.exit(1);
}

const CODE = process.argv[2] ?? "999888777";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function sql(query) {
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const [{ body: users }] = [await sql("select id from profiles limit 1")];
const uid = users?.[0]?.id;
if (!uid) throw new Error("no profile to test with");

// Reset the card and note the wallet's starting point.
await sql(`
  insert into gift_cards (code, original_amount, current_balance, currency, status, buyer_name)
  values ('${CODE}', 40, 40, 'USD', 'active', 'race test')
  on conflict (code) do update set current_balance = 40, status = 'active';
`);
const before = await sql(`select balance from wallets where profile_id = '${uid}'`);
const startBalance = Number(before.body?.[0]?.balance ?? 0);

const attempt = `
  select set_config('request.jwt.claims', '{"sub":"${uid}","role":"authenticated"}', true);
  select * from redeem_gift_card_to_wallet('${CODE}');
`;

console.log(`Firing two redemptions of ${CODE} at the same instant...`);
console.log(`wallet before: ${startBalance}\n`);

const [a, b] = await Promise.all([sql(attempt), sql(attempt)]);

const describe = (r, label) =>
  console.log(
    `${label}: ${r.ok ? "SUCCEEDED" : "refused"} — ${
      r.ok ? JSON.stringify(r.body) : String(r.body?.message ?? "").split("\n")[0].slice(0, 90)
    }`
  );
describe(a, "tap-A");
describe(b, "tap-B");

const after = await sql(`
  select
    (select balance from wallets where profile_id = '${uid}') as wallet_balance,
    (select current_balance from gift_cards where code = '${CODE}') as card_balance,
    (select status from gift_cards where code = '${CODE}') as card_status,
    (select count(*) from wallet_transactions
      where kind = 'redeem'
        and gift_card_id = (select id from gift_cards where code = '${CODE}')) as redeem_rows
`);
const row = after.body?.[0] ?? {};
const gained = Number(row.wallet_balance ?? 0) - startBalance;

console.log(`\nwallet after:   ${row.wallet_balance}  (gained ${gained})`);
console.log(`card balance:   ${row.card_balance}`);
console.log(`card status:    ${row.card_status}`);
console.log(`redeem rows:    ${row.redeem_rows}`);

const succeeded = [a, b].filter((r) => r.ok).length;
const pass = succeeded === 1 && gained === 40 && Number(row.redeem_rows) === 1;
console.log(
  `\n${succeeded} of 2 calls succeeded.\n${
    pass
      ? "PASS — the card was worth 40, the wallet gained 40, and exactly one transaction was written."
      : "FAIL — the money did not land exactly once. Do not ship this."
  }`
);
process.exit(pass ? 0 : 1);
