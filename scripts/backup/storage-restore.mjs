/**
 * Push a storage mirror back into Supabase Storage.
 *
 * The other half of a restore: the database dump brings back the rows that
 * point at photos, this brings back the photos. Every file goes back to the
 * exact path it came from, so the `storage_path` values already in the
 * restored database keep resolving.
 *
 * Usage: node storage-restore.mjs <mirror-dir>
 * Env:   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (of the TARGET project)
 *
 * Safe to re-run: a file that is already there with the same size is skipped,
 * so an interrupted restore can simply be started again. It never deletes
 * anything at the target.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";

const root = process.argv[2];
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!root) fail("usage: node storage-restore.mjs <mirror-dir>");
if (!existsSync(root)) fail(`${root} does not exist`);
if (!url || !key) fail("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");

function fail(msg) {
  console.error(`storage-restore: ${msg}`);
  process.exit(1);
}

const auth = { apikey: key, Authorization: `Bearer ${key}` };

const MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};
const mimeOf = (name) => MIME[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

async function filesUnder(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesUnder(full)));
    else out.push(full);
  }
  return out;
}

const existing = await fetch(`${url}/storage/v1/bucket`, { headers: auth }).then((r) => r.json());
const existingNames = new Set((Array.isArray(existing) ? existing : []).map((b) => b.name));

const buckets = (await readdir(root, { withFileTypes: true })).filter((e) => e.isDirectory());
if (buckets.length === 0) fail(`no bucket folders inside ${root}`);

let uploaded = 0;
let skipped = 0;

for (const bucket of buckets) {
  const name = bucket.name;

  if (!existingNames.has(name)) {
    // Recreated public unless it is the avatars bucket, which is private in
    // this project. Check the dashboard afterwards if you have added buckets.
    const isPublic = name !== "avatars";
    const res = await fetch(`${url}/storage/v1/bucket`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id: name, name, public: isPublic }),
    });
    console.log(`bucket ${name}: created (${isPublic ? "public" : "private"}) ${res.ok ? "ok" : await res.text()}`);
  }

  for (const file of await filesUnder(join(root, name))) {
    const path = relative(join(root, name), file).split(sep).join("/");
    const bytes = await readFile(file);

    // Already there at the same size? Leave it alone.
    const head = await fetch(`${url}/storage/v1/object/info/${name}/${encodeURI(path)}`, { headers: auth });
    if (head.ok) {
      const info = await head.json().catch(() => null);
      const size = Number(info?.size ?? info?.metadata?.size ?? NaN);
      if (Number.isFinite(size) && size === (await stat(file)).size) {
        skipped++;
        continue;
      }
    }

    const res = await fetch(`${url}/storage/v1/object/${name}/${encodeURI(path)}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": mimeOf(basename(path)), "x-upsert": "true" },
      body: bytes,
    });
    if (!res.ok) fail(`upload ${name}/${path} → ${res.status} ${(await res.text()).slice(0, 160)}`);
    uploaded++;
    if (uploaded % 25 === 0) console.log(`  ${uploaded} uploaded…`);
  }
  console.log(`bucket ${name}: done`);
}

console.log(`storage restore: ${uploaded} uploaded · ${skipped} already present`);
