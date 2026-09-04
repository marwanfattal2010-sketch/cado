/**
 * Re-photographs the discounted Fashion products that surface in Super Deals.
 *
 * WHY
 *
 * The Super Deals band reads cheap, and the section is not the reason — the
 * seed photographs are. The Bugatti scarf shot is the standard being failed:
 * it is not a product shot at all.
 *
 * WHAT THIS IS ALLOWED TO TOUCH
 *
 * `product_images` rows, and nothing else. No title, price, description,
 * category or active flag is written by this file. A photograph is a claim
 * about what someone is buying, so the only test a candidate has to pass is
 * "is this the item the row describes" — pretty is second.
 *
 * DEACTIVATE, DON'T DELETE. The old row stays in `product_images` with
 * `is_primary = false` and its bytes stay in the bucket. Reverting a bad swap
 * is one UPDATE, and no image is ever lost.
 *
 * MODES
 *
 *   node scripts/reshoot-super-deals-fashion.mjs list
 *       Prints the scope: active Fashion products with compare_at_price > price.
 *
 *   node scripts/reshoot-super-deals-fashion.mjs sheet out.png "Label=<url>" ...
 *       Screenshots a labelled grid of arbitrary image URLs via headless Chrome,
 *       so candidates get looked at as pixels rather than as filenames. This is
 *       contact-sheet.mjs's trick, generalised from Unsplash ids to full URLs
 *       because Pexels is in scope this round and the live bucket URLs have to
 *       be checkable too.
 *
 *   node scripts/reshoot-super-deals-fashion.mjs current sheet.png
 *       Contact sheet of what the six products carry RIGHT NOW.
 *
 *   node scripts/reshoot-super-deals-fashion.mjs apply [--dry]
 *       Downloads each chosen photo, uploads it under a new path, inserts a new
 *       primary product_images row and demotes the old one.
 *
 *   node scripts/reshoot-super-deals-fashion.mjs verify [sheet.png]
 *       Re-reads the database, fetches each public URL, decodes the header for
 *       real pixel dimensions, and checks the catalogue is otherwise untouched.
 *
 * THREE OF THE SIX ARE DELIBERATELY NOT TOUCHED
 *
 * Bugatti Men Scarf and Geox Men Belt are not seed rows. They carry real SKUs
 * (AMBUS25SFNTCO01, AMGXS26BTRVLE02), five units of stock each, country LB, and
 * they appear nowhere in dashboard_seed_registry. Their photographs are the
 * supplier's own shots of those exact items — the belt's path is literally
 * `clean.jpg` because strip-image-overlays.mjs painted another retailer's
 * banner off it and, in its own words, kept the picture because "swapping in a
 * stock picture of a different belt would misrepresent what is being sold".
 * That decision is already made in this repo and it is the right one: a
 * shopper paying $37.13 for that scarf is buying THAT scarf. Both shots also
 * already pass the stated bar — one item, plain white ground, sharp, no
 * baked-in text. What the scarf lacks is punch, and the only truthful cure for
 * that is a better photograph of the same scarf from GS.
 *
 * Merino Crewneck is a seed row and its photo IS a stack of five folded knits
 * rather than one garment — but its description ends "Shown with the rest of
 * the knit range", written for that photograph in
 * seed-menswear-and-chocolate.mjs. Dropping a single-garment shot in would
 * make the copy false, and this job is not allowed to edit copy. Swapping both
 * together is a decision for Marwan, not for this script.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
const BUCKET = "product-images";
const DRY = process.argv.includes("--dry");

function env() {
  let url, key;
  for (const line of readFileSync(ENV, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (m[1] === "NEXT_PUBLIC_SUPABASE_URL") url = v;
    if (m[1] === "SUPABASE_SERVICE_ROLE_KEY") key = v;
  }
  if (!url || !key) throw new Error("Supabase URL or service role key missing");
  return { url, key };
}

const { url, key } = env();
const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function rest(path, init = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const publicUrl = (p) => `${url}/storage/v1/object/public/${BUCKET}/${p}`;

async function upload(path, buf, contentType) {
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" },
    body: buf,
  });
  if (!res.ok) throw new Error(`upload ${path}: ${res.status} ${await res.text()}`);
}

/* -------------------------------------------------------------------------- */
/* The chosen photographs                                                     */
/*                                                                            */
/* `source` is the traceable id: an Unsplash photo id (the slug after          */
/* `photo-` on images.unsplash.com) or a Pexels photo id. `url` is what gets   */
/* downloaded. Every one of these was rendered on a contact sheet and looked   */
/* at before it was written down; the rejects are listed under REJECTED so     */
/* nobody re-picks them.                                                      */
/* -------------------------------------------------------------------------- */

const PICKS = [
  {
    slug: "leather-weekend-bag",
    file: "duffel.jpg",
    source: "unsplash:1525103504173-8dc1582c7430",
    credit: "Jed Owen (@jediahowen), Unsplash",
    url: "https://images.unsplash.com/photo-1525103504173-8dc1582c7430?w=1600&q=85&fm=jpg",
    // A brown full-grain leather duffel, whole bag in frame, twin rolled
    // handles, visible grain and patina. Road behind it thrown fully out of
    // focus. Row says "Full-grain leather duffel for short trips" — this is
    // that object. NOT a studio sweep, and landscape: see the note in the
    // report. It replaces a shot of the right bag against a brick wall with a
    // NEWSPAPER under it whose headline is legible, which is the one thing
    // strip-image-overlays.mjs already established this catalogue will not
    // carry.
  },
  {
    slug: "silk-wrap-dress",
    file: "wrap.jpg",
    source: "pexels:7256045",
    credit: "Mark Poul Berdin Capito, Pexels",
    url: "https://images.pexels.com/photos/7256045/pexels-photo-7256045.jpeg?auto=compress&cs=tinysrgb&w=1600",
    // Sage satin WRAP dress: crossover V bodice, wrapped skirt, tie at the
    // waist, blouson sleeves, plain black studio ground. Both claims in the
    // row — "silk" and "wrap" — are visible in the frame. The photo it
    // replaces is a navy SHIRT dress with a collar and a button placket, worn
    // by a model holding a sash across her face: the wrong garment type as
    // well as the wrong kind of picture.
    //
    // The model holds a small clutch. That is a second object in frame and it
    // is the only rule this pick bends; the dress is still plainly the
    // subject, and no honest silk-wrap alternative on a plain ground exists in
    // the free pools (the others are gowns, shirt dresses or matte crepe).
  },
  {
    slug: "tailored-blazer",
    file: "blazer.jpg",
    source: "pexels:17049869",
    credit: "Tran Nhu Tuan, Pexels",
    url: "https://images.pexels.com/photos/17049869/pexels-photo-17049869.jpeg?auto=compress&cs=tinysrgb&w=1600",
    // Camel women's tailored blazer — notch lapel, double-breasted buttons,
    // patch pockets — over a white top, plain white seamless, sharp, portrait.
    // The row sits in Fashion > Women, so a women's cut is the honest read.
    // Replaces an editorial shot of a full beige trouser SUIT with the model's
    // face cropped and her arm over her head.
  },
];

/*
 * REJECTED ON SIGHT — every one of these was rendered on a contact sheet and
 * looked at. Listed so nobody re-picks them.
 *
 *   pexels 9391902   duffel  — "Herschel" wordmark on the strap
 *   pexels 5120082   duffel  — Herschel again, and canvas rather than leather
 *   pexels 9582664   duffel  — white brand label centred in frame
 *   unsplash 1645276241987   — monogram-print satchel; a logo pattern, and not a duffel
 *   unsplash 1541336318489   — "WALK / STAND" painted across the floor
 *   unsplash 1758542988969   — black soft leather, no handles or straps visible;
 *                              reads as a hobo bag, not a weekend duffel
 *   pexels 1152077   bag     — clean studio shot, but a messenger satchel
 *   pexels 10919291  bag     — clean studio shot, but a handbag
 *   unsplash 1448582649076   — brown duffel, already spent as tab art (art-manifest.json)
 *   pexels 19531051  blazer  — shop window, "ONA" sign legible behind it
 *   pexels 7778886   blazer  — a printed photo card pinned to the lapel
 *   pexels 30455413  blazer  — collar label legible, and a rack of them
 *   pexels 9218538   blazer  — a handbag hanging on the same hanger
 *   pexels 29434354  blazer  — worn open with nothing under it
 *   pexels 5450671   dress   — a real wrap dress, but matte jersey not silk,
 *                              dim, hem cropped, brown mottled carpet behind
 *   pexels 19771924  dress   — silk, plain ground, but a cowl neck, not a wrap
 *   pexels 27599543  dress   — plain seamless, but matte crepe and the garment
 *                              is about a sixth of the frame
 *   pexels 12944791  knit    — colour-blocked; not a fine-gauge crewneck
 *   pexels 31383476  knit    — "Anselmi" branded hanger
 */

/* -------------------------------------------------------------------------- */
/* Modes                                                                      */
/* -------------------------------------------------------------------------- */

async function scope() {
  const [cat] = await rest("categories?select=id,slug&slug=eq.fashion");
  const prods = await rest(
    `products?select=id,title,slug,price,compare_at_price,description,partner_id&category_id=eq.${cat.id}&is_active=eq.true&order=title`
  );
  return prods.filter((p) => p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price));
}

async function images(ids) {
  return rest(`product_images?select=id,product_id,storage_path,is_primary&product_id=in.(${ids.join(",")})`);
}

/** Headless-Chrome contact sheet over arbitrary URLs. */
async function sheet(out, items) {
  const PORT = 9337;
  const COLS = Math.min(3, items.length);
  const CELL = 340;
  const BROWSERS = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  // `contain` on a white ground, not `cover`: this sheet is for judging whether
  // the object in frame is the right object, and a cover crop hides the edges
  // of it. The card crop is judged separately.
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#fff;font:600 13px system-ui,sans-serif;color:#111}
    .g{display:grid;grid-template-columns:repeat(${COLS},${CELL}px);gap:10px;padding:10px}
    figure{margin:0}
    img{width:${CELL}px;height:${CELL}px;object-fit:contain;background:#f2f2f2;display:block;border-radius:6px}
    figcaption{padding:4px 2px 10px;line-height:1.25}
  </style><div class="g">${items
    .map((it) => `<figure><img src="${esc(it.url)}" referrerpolicy="no-referrer"><figcaption>${esc(it.label)}</figcaption></figure>`)
    .join("")}</div>`;

  const exe = BROWSERS.find((p) => existsSync(p));
  if (!exe) throw new Error("No Chrome or Edge found.");
  const child = spawn(
    exe,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--user-data-dir=" + join(process.env.TEMP || ".", "cado-deals-sheet"),
      "about:blank",
    ],
    { stdio: "ignore" }
  );
  try {
    let page;
    for (let i = 0; i < 60 && !page; i++) {
      try {
        const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        page = tabs.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      } catch {
        /* not up yet */
      }
      if (!page) await new Promise((r) => setTimeout(r, 500));
    }
    if (!page) throw new Error("DevTools never became reachable");

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    const waiting = new Map();
    let id = 0;
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = () => rej(new Error("devtools socket"));
    });
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      const w = waiting.get(m.id);
      if (!w) return;
      waiting.delete(m.id);
      m.error ? w.rej(new Error(m.error.message)) : w.res(m.result);
    };
    const send = (method, params) =>
      new Promise((res, rej) => {
        const mine = ++id;
        waiting.set(mine, { res, rej });
        ws.send(JSON.stringify({ id: mine, method, params }));
        setTimeout(() => rej(new Error(`${method} timed out`)), 120000);
      });

    const rows = Math.ceil(items.length / COLS);
    await send("Emulation.setDeviceMetricsOverride", {
      width: COLS * (CELL + 10) + 10,
      height: rows * (CELL + 36) + 20,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.enable", {});
    await send("Page.navigate", { url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}` });
    const loaded = await send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        for (let i = 0; i < 160; i++) {
          const imgs = [...document.images];
          if (imgs.length && imgs.every((im) => im.complete)) break;
          await new Promise(r => setTimeout(r, 250));
        }
        return [...document.images].filter(im => im.naturalWidth === 0).length;
      })()`,
    });
    const failed = loaded.result?.value ?? 0;
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(out, Buffer.from(shot.data, "base64"));
    ws.close();
    console.log(`${out} — ${items.length} images${failed ? `, ${failed} FAILED TO LOAD` : ""}`);
  } finally {
    child.kill();
  }
}

/** Pixel dimensions straight out of the file header — proof the bytes decode. */
function dimensions(buf) {
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG")
    return { type: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const fmt = buf.toString("ascii", 12, 16);
    if (fmt === "VP8X") return { type: "webp", w: (buf.readUIntLE(24, 3) & 0xffffff) + 1, h: (buf.readUIntLE(27, 3) & 0xffffff) + 1 };
    if (fmt === "VP8 ") return { type: "webp", w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (fmt === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { type: "webp", w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
    return { type: "webp", w: 0, h: 0 };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const marker = buf[o + 1];
      const len = buf.readUInt16BE(o + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return { type: "jpeg", h: buf.readUInt16BE(o + 5), w: buf.readUInt16BE(o + 7) };
      o += 2 + len;
    }
  }
  return null;
}

/* -------------------------------------------------------------------------- */

const mode = process.argv[2];

if (mode === "list") {
  const rows = await scope();
  const imgs = await images(rows.map((r) => r.id));
  for (const p of rows) {
    const pct = Math.round((1 - p.price / p.compare_at_price) * 100);
    console.log(`${p.title}  $${p.price} was $${p.compare_at_price} (-${pct}%)  id=${p.id}`);
    for (const im of imgs.filter((i) => i.product_id === p.id))
      console.log(`    ${im.is_primary ? "PRIMARY" : "       "} ${im.storage_path}`);
  }
  console.log(`\n${rows.length} discounted, active Fashion products.`);
} else if (mode === "sheet") {
  const out = process.argv[3];
  const items = process.argv.slice(4).map((a) => {
    const i = a.indexOf("=");
    return { label: a.slice(0, i), url: a.slice(i + 1) };
  });
  await sheet(out, items);
} else if (mode === "current") {
  const rows = await scope();
  const imgs = await images(rows.map((r) => r.id));
  await sheet(
    process.argv[3] ?? "current.png",
    rows.map((p) => {
      const im = imgs.find((i) => i.product_id === p.id && i.is_primary);
      return { label: p.title, url: im ? publicUrl(im.storage_path) : "" };
    })
  );
} else if (mode === "apply") {
  if (!PICKS.length) {
    console.error("PICKS is empty — nothing to apply. Curate first.");
    process.exit(1);
  }
  const rows = await scope();
  for (const pick of PICKS) {
    const p = rows.find((r) => r.slug === pick.slug);
    if (!p) throw new Error(`${pick.slug} is not in the discounted-Fashion scope — nothing was written`);

    const res = await fetch(pick.url, { headers: { "User-Agent": "cado-reshoot" } });
    if (!res.ok) throw new Error(`${pick.slug}: source ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const dim = dimensions(buf);
    if (!dim || dim.w < 800 || dim.h < 800)
      throw new Error(`${pick.slug}: source did not decode or is too small (${JSON.stringify(dim)})`);

    if (DRY) {
      console.log(`  ~ ${p.title}  ${dim.type} ${dim.w}x${dim.h}  ${pick.source} — dry run`);
      continue;
    }

    // A NEW path every time, so the old bytes stay put and no CDN can serve a
    // stale copy of the replacement.
    const path = `${p.partner_id}/${p.id}/${pick.file}`;
    await upload(path, buf, dim.type === "png" ? "image/png" : dim.type === "webp" ? "image/webp" : "image/jpeg");

    // Demote first, insert second: a moment with zero primaries is survivable,
    // a moment with two is not — the storefront picks one arbitrarily.
    await rest(`product_images?product_id=eq.${p.id}&is_primary=is.true`, {
      method: "PATCH",
      body: JSON.stringify({ is_primary: false }),
    });
    await rest("product_images", {
      method: "POST",
      body: JSON.stringify({ product_id: p.id, partner_id: p.partner_id, storage_path: path, is_primary: true }),
    });
    console.log(`  ~ ${p.title}  ${dim.type} ${dim.w}x${dim.h}  source=${pick.source}`);
  }
  console.log("\nDone. Old rows kept, demoted to is_primary = false.");
} else if (mode === "verify") {
  const rows = await scope();
  const imgs = await images(rows.map((r) => r.id));
  let bad = 0;
  const sheetItems = [];
  for (const p of rows) {
    const mine = imgs.filter((i) => i.product_id === p.id);
    const prim = mine.filter((i) => i.is_primary);
    const pick = PICKS.find((k) => k.slug === p.slug);
    let line = `${p.title}: ${mine.length} rows, ${prim.length} primary`;
    if (prim.length !== 1) { line += "  <<< NOT EXACTLY ONE PRIMARY"; bad++; }
    if (prim.length === 1) {
      const u = publicUrl(prim[0].storage_path);
      const r = await fetch(u);
      const buf = Buffer.from(await r.arrayBuffer());
      const d = dimensions(buf);
      line += `  HTTP ${r.status}  ${d ? `${d.type} ${d.w}x${d.h}` : "UNDECODABLE"}  ${(buf.length / 1024) | 0}KB`;
      if (r.status !== 200 || !d || d.w < 400) { line += "  <<< BAD"; bad++; }
      if (pick && !prim[0].storage_path.endsWith(pick.file)) { line += "  <<< PRIMARY IS NOT THE NEW FILE"; bad++; }
      sheetItems.push({ label: `${p.title} — $${p.price} was $${p.compare_at_price}`, url: u });
    }
    console.log(line);
  }
  const allActive = await rest("products?select=id&is_active=eq.true");
  console.log(`\nactive products: ${allActive.length} (expected 121)`);
  if (allActive.length !== 121) { console.log("  <<< COUNT CHANGED"); bad++; }
  if (process.argv[3]) await sheet(process.argv[3], sheetItems);
  console.log(bad ? `\n${bad} PROBLEM(S).` : "\nAll checks passed.");
  process.exit(bad ? 1 : 0);
} else {
  console.error("modes: list | sheet <out.png> \"Label=url\"... | current <out.png> | apply [--dry] | verify [out.png]");
  process.exit(1);
}
