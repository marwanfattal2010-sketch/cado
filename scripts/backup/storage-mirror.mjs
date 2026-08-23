/**
 * Mirror every Supabase Storage bucket into a local folder.
 *
 * A database dump does NOT contain uploaded files — Storage lives in S3, and
 * `storage.objects` only holds the metadata rows. Restoring a dump without
 * this mirror would give you a catalogue whose every photo is a broken link.
 *
 * A MIRROR, not an archive: files that no longer exist remotely are deleted
 * locally, so the backup is what the project looks like TODAY rather than
 * every photo that ever existed. Photos are content-addressed by path and
 * rarely change, so this stays cheap — unchanged files are skipped by size,
 * and only new or resized ones are downloaded.
 *
 * Usage: node storage-mirror.mjs <destination-dir>
 * Env:   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * The service-role key is read from the environment and never printed. Any
 * failure exits non-zero: a partial mirror must fail the job rather than be
 * committed as if it were a backup.
 */
import { mkdir, writeFile, readdir, stat, unlink, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

const dest = process.argv[2];
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dest) fail("usage: node storage-mirror.mjs <destination-dir>");
if (!url || !key) fail("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");

function fail(msg) {
  console.error(`storage-mirror: ${msg}`);
  process.exit(1);
}

const auth = { apikey: key, Authorization: `Bearer ${key}` };

/** Fetch with a few retries — a single flaky download must not fail a night. */
async function withRetry(label, fn, attempts = 4) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        const wait = 500 * 2 ** (i - 1);
        console.warn(`  retry ${i}/${attempts - 1} for ${label} in ${wait}ms (${err.message})`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastErr?.message}`);
}

/**
 * List one bucket, recursively.
 *
 * The list endpoint is one directory level at a time: an entry with a null
 * `id` is a folder, not a file. It also pages — `limit` caps at 1000, so a
 * bucket with more objects in one prefix needs the offset loop below.
 */
async function listAll(bucket, prefix = "") {
  const out = [];
  let offset = 0;
  const PAGE = 1000;
  for (;;) {
    const page = await withRetry(`list ${bucket}/${prefix}`, async () => {
      const res = await fetch(`${url}/storage/v1/object/list/${bucket}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix,
          limit: PAGE,
          offset,
          sortBy: { column: "name", order: "asc" },
        }),
      });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
      return res.json();
    });

    for (const item of page) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) out.push(...(await listAll(bucket, path)));
      else out.push({ path, size: item.metadata?.size ?? null });
    }

    if (page.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

async function download(bucket, path) {
  return withRetry(`download ${bucket}/${path}`, async () => {
    const res = await fetch(`${url}/storage/v1/object/${bucket}/${encodeURI(path)}`, { headers: auth });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
    return Buffer.from(await res.arrayBuffer());
  });
}

/** Every file currently on disk under dir, as paths relative to it. */
async function localFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await localFiles(full)));
    else out.push(full);
  }
  return out;
}

const buckets = await withRetry("list buckets", async () => {
  const res = await fetch(`${url}/storage/v1/bucket`, { headers: auth });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
});

console.log(`buckets: ${buckets.map((b) => b.name).join(", ") || "(none)"}`);

let downloaded = 0;
let skipped = 0;
let removed = 0;
let objects = 0;
const keep = new Set();

for (const bucket of buckets) {
  const items = await listAll(bucket.name);
  objects += items.length;
  console.log(`${bucket.name}: ${items.length} objects`);

  for (const item of items) {
    const target = join(dest, bucket.name, ...item.path.split("/"));
    keep.add(target);

    // Same size on disk means the same file: Storage paths are per-object and
    // a re-upload lands on a new path, so size is a sufficient check here and
    // saves re-downloading 200 photos every night.
    if (item.size != null && existsSync(target)) {
      const st = await stat(target);
      if (st.size === item.size) {
        skipped++;
        continue;
      }
    }

    const bytes = await download(bucket.name, item.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    downloaded++;
  }
}

// The mirror half: anything on disk that is no longer in the project goes.
for (const file of await localFiles(dest)) {
  if (!keep.has(file)) {
    await unlink(file);
    removed++;
    console.log(`removed (gone remotely): ${relative(dest, file).split(sep).join("/")}`);
  }
}

// Tidy up bucket folders that emptied out entirely.
if (existsSync(dest)) {
  for (const entry of await readdir(dest, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!buckets.some((b) => b.name === entry.name)) {
      await rm(join(dest, entry.name), { recursive: true, force: true });
      console.log(`removed bucket folder (gone remotely): ${entry.name}`);
    }
  }
}

console.log(
  `storage mirror: ${objects} objects live · ${downloaded} downloaded · ${skipped} unchanged · ${removed} deleted`
);

// Written for the job summary and the commit message.
await writeFile(join(dest, "..", "storage-count.txt"), String(objects));
