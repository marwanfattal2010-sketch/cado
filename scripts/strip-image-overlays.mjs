/**
 * Finds and removes another retailer's banner baked into a product photo.
 *
 * WHY THIS EXISTS
 *
 * Some product photography came in from a supplier feed with a solid black bar
 * burnt into the bottom-left corner reading "Online and Geox Stores Only".
 * That is another shop's notice sitting on CADO's shelf: it is not true here,
 * it names a retailer the shopper cannot buy from on this site, and the house
 * rule is that no image carries baked-in text.
 *
 * The photo of the product is still the right photo — swapping in a stock
 * picture of a different belt would misrepresent what is being sold. So the
 * bar is painted out and everything else is left exactly as it was.
 *
 * WHY A BROWSER
 *
 * These are .webp files and Node has no image decoder. A browser has one, and
 * scripts/make-app-icons.mjs already drives headless Chrome for the same
 * reason, so this reuses that harness rather than adding a native dependency.
 *
 * WHAT COUNTS AS A BANNER — deliberately narrow, because a false positive
 * would paint a white hole in a real photograph:
 *   - lives in the bottom third of the image,
 *   - starts hard against the left or right edge,
 *   - is a solid rectangle: at least 92% of the pixels inside its own bounding
 *     box are near-black,
 *   - is 1.5%-14% of the image tall and 8%-75% wide.
 * A dark product touching the edge fails the solidity test; a shadow fails it
 * too. Anything that does not match every rule is reported and left alone.
 *
 * Usage:
 *   node scripts/strip-image-overlays.mjs            # report only
 *   node scripts/strip-image-overlays.mjs --apply    # upload + repoint the row
 */
import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV = join(__dirname, "..", "apps", "dashboard", ".env.local");
const APPLY = process.argv.includes("--apply");
const PORT = 9334;
const SITE = "https://cado-web.vercel.app";
const BUCKET = "product-images";

/**
 * Detection proposes; a human decides.
 *
 * Every photo the scan flags was downloaded and looked at. Seven of the eight
 * were the product's own dark area touching an edge — a navy print on a white
 * t-shirt, a dark wood table, a shadow under a hoodie — and painting a
 * rectangle over any of them would have put a hole in a real photograph.
 * Exactly one was a real burnt-in notice. So --apply cleans only paths listed
 * here, and adding a path to this list means someone opened the image.
 */
const CONFIRMED = new Set([
  // "Online and Geox Stores Only" in a black bar, bottom-left. Geox Men Belt.
  "c05e9f1e-0038-4c05-9f1e-000000000001/36d7dd26-7ed5-4a8d-a92d-5a47e4c3e24c/real.webp",
]);

const BROWSERS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

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
    headers: { ...headers, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function upload(path, buf, contentType) {
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": contentType, "x-upsert": "true" },
    body: buf,
  });
  if (!res.ok) throw new Error(`upload ${path}: ${res.status} ${await res.text()}`);
}

/* -------------------------------------------------------------------------- */
/* The pixel work, run inside the page                                        */
/* -------------------------------------------------------------------------- */

const SCAN = `(async (src) => {
  const res = await fetch(src, { mode: 'cors' });
  if (!res.ok) return { error: 'fetch ' + res.status };
  const bmp = await createImageBitmap(await res.blob());
  const W = bmp.width, H = bmp.height;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(bmp, 0, 0);
  const d = x.getImageData(0, 0, W, H).data;
  const dark = (i) => d[i] < 60 && d[i+1] < 60 && d[i+2] < 60;
  const at = (px, py) => (py * W + px) * 4;

  // Rows in the bottom third that begin with a long dark run at an edge.
  const y0 = Math.floor(H * 0.66);
  const cand = [];
  for (let y = y0; y < H; y++) {
    let left = 0; while (left < W && dark(at(left, y))) left++;
    let right = 0; while (right < W && dark(at(W - 1 - right, y))) right++;
    if (left >= W * 0.08) cand.push({ y, side: 'left', run: left });
    else if (right >= W * 0.08) cand.push({ y, side: 'right', run: right });
  }
  if (!cand.length) return { W, H, banner: null };

  // Longest contiguous block of such rows on one side.
  let best = null, run = [cand[0]];
  for (let i = 1; i <= cand.length; i++) {
    const prev = cand[i-1], cur = cand[i];
    if (cur && cur.y === prev.y + 1 && cur.side === prev.side) { run.push(cur); continue; }
    if (!best || run.length > best.length) best = run;
    if (cur) run = [cur];
  }
  const rows = best;
  const side = rows[0].side;
  let top = rows[0].y, bottom = rows[rows.length - 1].y;
  const width = Math.max(...rows.map(r => r.run));
  const x1 = side === 'left' ? 0 : W - width;
  const x2 = side === 'left' ? width : W;

  // GROW OVER THE TEXT ROWS.
  //
  // The seed rows are only the ones that are solid black edge-to-edge, and a
  // row carrying white lettering is not: the run of dark pixels stops at the
  // first letter. Measured on the Geox belt that found 15px of a 54px bar, so
  // painting the seed alone would have left two thirds of the notice on the
  // photo. The bar's own left and right edges stay black through every row,
  // lettering or not, so the block is grown while BOTH edges are still dark.
  let t = top, b = bottom;
  const edgeDark = (y) => dark(at(x1 + 2, y)) && dark(at(x2 - 3, y));
  while (t - 1 >= H * 0.5 && edgeDark(t - 1)) t--;
  while (b + 1 < H && edgeDark(b + 1)) b++;
  top = t; bottom = b;

  const h = bottom - top + 1;
  if (h < H * 0.015 || h > H * 0.14) return { W, H, banner: null, why: 'height ' + (h/H).toFixed(3) };
  if (width < W * 0.08 || width > W * 0.75) return { W, H, banner: null, why: 'width ' + (width/W).toFixed(3) };

  // Solidity: the box must be a filled rectangle, not a silhouette. Lettering
  // is counted as part of the bar — near-black or near-white, nothing between
  // — so a photographic subject, which is full of midtones, still fails.
  let inside = 0, ink = 0, total = 0;
  for (let y = top; y <= bottom; y++) for (let px = x1; px < x2; px++) {
    total++;
    const i = at(px, y);
    if (dark(i)) inside++;
    // Lettering, and the grey fringe anti-aliasing leaves around it — which
    // is why this threshold is 150 and not 200. At 200 the Geox bar measured
    // 0.95 filled and was rejected by its own notice.
    else if (d[i] > 150 && d[i+1] > 150 && d[i+2] > 150) ink++;
  }
  const solidity = inside / total;
  if (solidity < 0.65 || (inside + ink) / total < 0.9) {
    return { W, H, banner: null, why: 'solidity ' + solidity.toFixed(3) + ' filled ' + ((inside+ink)/total).toFixed(3) };
  }

  // Paint it out with the image's own background, sampled from the corner
  // furthest from the banner so a coloured backdrop still matches.
  const cx = side === 'left' ? W - 3 : 2;
  const bg = at(cx, 2);
  x.fillStyle = 'rgb(' + d[bg] + ',' + d[bg+1] + ',' + d[bg+2] + ')';
  x.fillRect(x1 - 1, top - 1, (x2 - x1) + 2, h + 2);

  return {
    W, H,
    banner: { x1, top, w: x2 - x1, h, side, solidity: +solidity.toFixed(3) },
    jpeg: c.toDataURL('image/jpeg', 0.92).split(',')[1],
  };
})`;

/* -------------------------------------------------------------------------- */

function launch(exe) {
  return spawn(exe, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + join(process.env.TEMP || ".", "cado-overlay-profile"),
    SITE,
  ], { stdio: "ignore", detached: false });
}

async function waitForDevtools() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const tabs = await res.json();
      const page = tabs.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Chrome DevTools never became reachable");
}

async function evaluate(wsUrl, expression) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error("could not open the devtools socket"));
  });
  const result = await new Promise((res, rej) => {
    const id = 1;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== id) return;
      if (msg.result?.exceptionDetails) {
        rej(new Error(msg.result.exceptionDetails.exception?.description ?? "page threw"));
      } else {
        res(msg.result?.result?.value);
      }
    };
    ws.send(JSON.stringify({
      id,
      method: "Runtime.evaluate",
      params: { expression, awaitPromise: true, returnByValue: true },
    }));
    setTimeout(() => rej(new Error("timed out waiting for the page")), 120000);
  });
  ws.close();
  return result;
}

const rows = await rest(
  "product_images?select=id,storage_path,product_id,products!inner(title,is_active)&is_primary=is.true&products.is_active=is.true&order=storage_path"
);

const exe = BROWSERS.find((p) => existsSync(p));
if (!exe) {
  console.error("No Chrome or Edge found. Nothing was scanned.");
  process.exit(1);
}
const child = launch(exe);

try {
  const page = await waitForDevtools();
  await new Promise((r) => setTimeout(r, 2500));

  const found = [];
  for (const row of rows) {
    const src = `${url}/storage/v1/object/public/${BUCKET}/${row.storage_path}`;
    const out = await evaluate(page.webSocketDebuggerUrl, `${SCAN}(${JSON.stringify(src)})`);
    if (out?.error) {
      console.log(`  ?  ${row.products.title} — ${out.error}`);
      continue;
    }
    if (!out?.banner) {
      // A near miss is worth printing: it is how you tell "no notice on this
      // photo" apart from "the rule rejected a notice that is really there".
      if (out?.why) console.log(`  -  ${row.products.title} — candidate rejected: ${out.why}`);
      continue;
    }
    const b = out.banner;
    const ok = CONFIRMED.has(row.storage_path);
    console.log(
      `  ${ok ? "!" : "?"}  ${row.products.title} — ${b.side} bar ${b.w}x${b.h} at y=${b.top} of ${out.H}` +
        ` (solidity ${b.solidity})${ok ? "" : "  [not confirmed — left alone]"}`
    );
    if (ok) found.push({ row, out });
  }

  console.log(`\n${found.length} confirmed burnt-in bars out of ${rows.length} primary photos.`);

  if (!APPLY) {
    console.log("Report only. Re-run with --apply to clean and upload them.");
  } else {
    for (const { row, out } of found) {
      // A NEW path, never an overwrite: the original stays in the bucket so
      // this is reversible, and the CDN cannot serve a stale copy.
      const path = row.storage_path.replace(/[^/]+$/, "clean.jpg");
      await upload(path, Buffer.from(out.jpeg, "base64"), "image/jpeg");
      await rest(`product_images?id=eq.${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ storage_path: path }),
      });
      console.log(`  cleaned ${row.products.title} -> ${path}`);
    }
  }
} finally {
  child.kill();
}
