/**
 * Seeds the featured-store cards and Store of the Week for the endless home.
 * Run AFTER migration 0065 is applied — it writes the columns 0065 creates.
 *
 * EVERY TAGLINE BELOW IS A FACT, NOT A PROMOTION. The spec's examples include
 * lines like "Up to 20% off this week" — which an admin may truthfully write
 * from the dashboard when such an offer exists. None exists today, so none is
 * written here. A promo line seeded by a script is an invented promise, and
 * the homepage card is a claim a shopper acts on.
 *
 *   Surprise Gifts Shop — their own Instagram bio, verbatim.
 *   Zahar              — they genuinely carry designer kids' labels.
 *   GS                 — a real store of gifts and accessories.
 *   Beirut Blooms      — its products genuinely carry the same_day flag.
 *
 * Auth: SERVICE ROLE key (UPDATE only — the columns already exist by now).
 * Usage: node scripts/seed-featured-stores.mjs
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
function env() {
  let url, key;
  for (const line of readFileSync(ENV, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (m[1] === "NEXT_PUBLIC_SUPABASE_URL") url = v;
    if (m[1] === "SUPABASE_SERVICE_ROLE_KEY") key = v;
  }
  return { url, key };
}
const { url, key } = env();
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, Prefer: "return=representation", ...(init.headers || {}) },
  });
  const b = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${b.slice(0, 220)}`);
  return b ? JSON.parse(b) : null;
}

const FEATURED = [
  ["surprise-gifts-shop", 1, "Curated gifts & décor for every celebration"],
  ["zahar", 2, "Designer kids' fashion"],
  ["gs", 3, "Gifts and accessories"],
  ["beirut-blooms", 4, "Fresh flowers, same-day"],
];

for (const [slug, rank, tagline] of FEATURED) {
  const rows = await rest(
    `partners?slug=eq.${slug}`,
    { method: "PATCH", body: JSON.stringify({ is_featured: true, featured_rank: rank, tagline }) }
  );
  console.log(rows.length ? `featured #${rank}: ${rows[0].name} — "${tagline}"` : `NOT FOUND: ${slug}`);
}

// Store of the Week: Surprise — the one partner whose photographs are their
// own. When an admin clears this from the dashboard later, the homepage
// auto-rotates weekly among the featured stores instead.
const [surprise] = await rest("partners?select=id&slug=eq.surprise-gifts-shop");
if (surprise) {
  await rest("homepage_config?id=eq.true", {
    method: "PATCH",
    body: JSON.stringify({ store_of_week_partner_id: surprise.id, updated_at: new Date().toISOString() }),
  });
  console.log("store of the week: Surprise Gifts Shop");
}
