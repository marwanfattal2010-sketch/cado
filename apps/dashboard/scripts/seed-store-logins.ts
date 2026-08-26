/**
 * One `partner` login for EVERY live seed store (§10 of the V2 spec).
 *
 * Until real stores sign, the seed partners ARE the stores, and each needs a
 * working owner account so the store side of the dashboard is genuinely
 * exercised. Same shape as create-demo-accounts.ts (which made five); this
 * covers all of them and writes the table to scratchpad/seed-store-logins.txt
 * — git-ignored, because a file of passwords must never be committed.
 *
 * Idempotent: existing users keep their passwords and are listed as
 * "(existing — password unchanged)". Sets partners.is_demo = true when that
 * column exists (0068), and skips silently when it does not yet.
 */
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function password(): string {
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

  const { data: partners, error } = await db
    .from("partners")
    .select("id, name, slug, status, is_live")
    .eq("status", "active")
    .order("name");
  if (error) throw error;

  // [TEST] stores exist only for the isolation test — no logins for those.
  const real = (partners ?? []).filter((p) => !p.name.startsWith("[TEST]"));

  const { data: usersPage } = await db.auth.admin.listUsers({ perPage: 1000 });
  const byEmail = new Map((usersPage?.users ?? []).map((u) => [u.email ?? "", u]));

  const rows: string[] = [];
  for (const p of real) {
    const email = `demo-${p.slug}@cado-demo.local`;
    const existing = byEmail.get(email);
    let line: string;

    if (existing) {
      await db.from("profiles").upsert(
        { id: existing.id, role: "partner", partner_id: p.id, full_name: `${p.name} (owner)` },
        { onConflict: "id" }
      );
      line = `${email} <unchanged> ${p.name}`;
    } else {
      const pw = password();
      const created = await db.auth.admin.createUser({
        email,
        password: pw,
        email_confirm: true,
      });
      if (created.error) {
        console.log(`! ${p.name}: ${created.error.message}`);
        continue;
      }
      await db.from("profiles").upsert(
        { id: created.data.user.id, role: "partner", partner_id: p.id, full_name: `${p.name} (owner)` },
        { onConflict: "id" }
      );
      line = `${email} ${pw} ${p.name}`;
    }

    // is_demo when the column exists (0068 applied); harmless before.
    const marked = await db.from("partners").update({ is_demo: true }).eq("id", p.id);
    if (marked.error && !/is_demo/.test(marked.error.message)) console.log(`  (is_demo: ${marked.error.message})`);

    rows.push(line);
    console.log(`✓ ${p.name} → ${email}`);
  }

  const out = resolve(__dirname, "../../../scratchpad/seed-store-logins.txt");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `# Store logins — NEVER commit this file (scratchpad/ is git-ignored)\n# format: email password store-name · <unchanged> = account existed already\n${rows.join("\n")}\n`
  );
  console.log(`\n${rows.length} logins → ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
