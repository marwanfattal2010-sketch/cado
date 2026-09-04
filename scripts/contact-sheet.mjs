/**
 * Builds a labelled contact sheet of candidate photos, so a human can judge a
 * dozen at once instead of opening them one at a time.
 *
 * The house rule is that no image ships without somebody looking at it. Held
 * to literally, one image per look, curating the art for eleven tabs would be
 * a hundred separate openings — and the thing you most need to see, whether a
 * row of seven reads as seven different things, is invisible when you look at
 * them one at a time anyway. A sheet shows the row as a row.
 *
 * IT SCREENSHOTS, IT DOES NOT DRAW.
 *
 * The first version composited onto a canvas from inside the live site, which
 * fails twice over: the site's CSP has no `connect-src` for images.unsplash.com
 * so every fetch is blocked, and a canvas holding a cross-origin image is
 * tainted and refuses toDataURL anyway. Plain `<img>` tags on a blank page hit
 * neither problem — image loading is not CORS-checked, and Page.captureScreenshot
 * reads the rendered pixels rather than the canvas.
 *
 * Usage:
 *   node scripts/contact-sheet.mjs out.png "label=photo-id" "label=photo-id" ...
 */
import { writeFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const PORT = 9335;
const BROWSERS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const [out, ...pairs] = process.argv.slice(2);
if (!out || !pairs.length) {
  console.error('Usage: node scripts/contact-sheet.mjs out.png "Label=photo-id" ...');
  process.exit(1);
}
const items = pairs.map((p) => {
  const i = p.indexOf("=");
  return { label: p.slice(0, i), id: p.slice(i + 1) };
});

const COLS = 4;
const CELL = 260;

const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#fff;font:600 14px system-ui,sans-serif;color:#111}
  .g{display:grid;grid-template-columns:repeat(${COLS},${CELL}px);gap:10px;padding:10px}
  figure{margin:0}
  /* object-fit: cover, because that is how a circle and a tile will crop it —
     judging an uncropped image and then shipping a square crop of it is how
     you end up with a headless model in a 62px circle. */
  img{width:${CELL}px;height:${CELL}px;object-fit:cover;background:#eee;display:block;border-radius:6px}
  figcaption{padding:4px 2px 8px;line-height:1.2}
</style><div class="g">${items
  .map(
    (it) =>
      `<figure><img src="https://images.unsplash.com/photo-${it.id}?w=600&q=70&fm=jpg" referrerpolicy="no-referrer"><figcaption>${it.label
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</figcaption></figure>`
  )
  .join("")}</div>`;

const exe = BROWSERS.find((p) => existsSync(p));
if (!exe) {
  console.error("No Chrome or Edge found.");
  process.exit(1);
}
const child = spawn(exe, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--user-data-dir=" + join(process.env.TEMP || ".", "cado-sheet-profile"),
  "about:blank",
], { stdio: "ignore" });

async function firstPage() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const tabs = await res.json();
      const p = tabs.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (p) return p;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("DevTools never became reachable");
}

/** A CDP client that can send more than one command. */
function client(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const waiting = new Map();
  let id = 0;
  const ready = new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error("devtools socket"));
  });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    const w = waiting.get(m.id);
    if (!w) return;
    waiting.delete(m.id);
    if (m.error) w.rej(new Error(m.error.message));
    else if (m.result?.exceptionDetails) {
      w.rej(new Error(m.result.exceptionDetails.exception?.description ?? "page threw"));
    } else w.res(m.result);
  };
  return {
    ready,
    send(method, params) {
      const mine = ++id;
      return new Promise((res, rej) => {
        waiting.set(mine, { res, rej });
        ws.send(JSON.stringify({ id: mine, method, params }));
        setTimeout(() => rej(new Error(`${method} timed out`)), 120000);
      });
    },
    close: () => ws.close(),
  };
}

try {
  const page = await firstPage();
  const cdp = client(page.webSocketDebuggerUrl);
  await cdp.ready;

  const rows = Math.ceil(items.length / COLS);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: COLS * (CELL + 10) + 10,
    height: rows * (CELL + 34) + 20,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await cdp.send("Page.enable", {});
  await cdp.send("Page.navigate", { url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}` });

  // Wait until every image has either decoded or given up, so a slow one is
  // never silently reported as "looked at".
  const loaded = await cdp.send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      for (let i = 0; i < 120; i++) {
        const imgs = [...document.images];
        if (imgs.length && imgs.every((im) => im.complete)) break;
        await new Promise(r => setTimeout(r, 250));
      }
      return [...document.images].filter(im => im.naturalWidth === 0).length;
    })()`,
  });
  const failed = loaded.result?.value ?? 0;

  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  cdp.close();
  console.log(`${out} — ${items.length} candidates${failed ? `, ${failed} FAILED TO LOAD` : ""}`);
} finally {
  child.kill();
}
