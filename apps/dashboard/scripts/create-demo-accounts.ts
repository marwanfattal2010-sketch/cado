/**
 * Create the five DEMO store-owner logins plus one demo admin.
 *
 * Picks the five real seed stores with the most products (never the [TEST]
 * isolation stores), creates an auth user for each at @cado-demo.local, and
 * points profiles.partner_id at the store — the same shape the invite flow
 * produces. Passwords are generated here, printed once to stdout, and written
 * into DEMO-ACCOUNTS.md by the caller. Idempotent: an existing demo user is
 * left alone (password unchanged) and reported.
 *
 * The @cado-demo.local domain is what the admin Partners page keys the DEMO
 * badge on. Replace a demo login with a real owner's email (via the invite
 * flow) and the badge disappears on its own.
 */
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function password(): string {
  // 4 groups of 4 from an unambiguous alphabet — typeable on a phone.
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const raw = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += alphabet[raw[i] % alphabet.length];
    if (i % 4 === 3 && i < 15) out += "-";
  }
  return out;
}

async function main() {
  const db = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

  // The five real stores with the largest catalogues.
  const { data: partners, error } = await db
    .from("partners")
    .select("id, name, slug, status, products(id)")
    .not("name", "ilike", "[TEST]%")
    .eq("status", "active");
  if (error) throw error;

  const top5 = (partners ?? [])
    .map((p) => ({ ...p, productCount: (p.products ?? []).length }))
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 5);

  const { data: existingUsers } = await db.auth.admin.listUsers({ page: 1, perPage: 500 });
  const byEmail = new Map((existingUsers?.users ?? []).map((u) => [u.email ?? "", u]));

  const results: Array<{ store: string; email: string; password: string; note: string }> = [];

  for (const p of top5) {
    const email = `demo-${p.slug}@cado-demo.local`;
    const existing = byEmail.get(email);

    if (existing) {
      // Make sure the profile is still wired correctly, but never touch the password.
      await db.from("profiles").upsert(
        { id: existing.id, role: "partner", partner_id: p.id, full_name: `[DEMO] ${p.name} Owner` },
        { onConflict: "id" }
      );
      results.push({ store: p.name, email, password: "(unchanged from first run)", note: "already existed" });
      continue;
    }

    const pw = password();
    const { data: created, error: cErr } = await db.auth.admin.createUser({
      email,
      password: pw,
      email_confirm: true,
    });
    if (cErr || !created.user) {
      results.push({ store: p.name, email, password: "-", note: `FAILED: ${cErr?.message}` });
      continue;
    }
    const { error: pErr } = await db.from("profiles").upsert(
      { id: created.user.id, role: "partner", partner_id: p.id, full_name: `[DEMO] ${p.name} Owner` },
      { onConflict: "id" }
    );
    results.push({
      store: p.name,
      email,
      password: pw,
      note: pErr ? `profile FAILED: ${pErr.message}` : "created",
    });
  }

  // Demo admin, so verifying the admin pages never needs Marwan's own Gmail login.
  const adminEmail = "demo-admin@cado-demo.local";
  const existingAdmin = byEmail.get(adminEmail);
  if (existingAdmin) {
    await db.from("profiles").upsert(
      { id: existingAdmin.id, role: "admin", full_name: "[DEMO] CADO Admin" },
      { onConflict: "id" }
    );
    results.push({ store: "(CADO admin)", email: adminEmail, password: "(unchanged from first run)", note: "already existed" });
  } else {
    const pw = password();
    const { data: created, error: cErr } = await db.auth.admin.createUser({
      email: adminEmail,
      password: pw,
      email_confirm: true,
    });
    if (cErr || !created.user) {
      results.push({ store: "(CADO admin)", email: adminEmail, password: "-", note: `FAILED: ${cErr?.message}` });
    } else {
      const { error: pErr } = await db.from("profiles").upsert(
        { id: created.user.id, role: "admin", full_name: "[DEMO] CADO Admin" },
        { onConflict: "id" }
      );
      results.push({
        store: "(CADO admin)",
        email: adminEmail,
        password: pw,
        note: pErr ? `profile FAILED: ${pErr.message}` : "created",
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
