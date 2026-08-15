/**
 * Renders the CADO launch screen artwork that the Android app ships.
 *
 * WHAT IT WRITES
 *
 *   apps/mobile/assets/splash-pattern.png    1242x2688, the persimmon screen
 *                                            with the tiled icon pattern and
 *                                            the cleared middle. No wordmark.
 *   apps/mobile/assets/splash-wordmark.png   1024x1024 transparent, the cream
 *                                            CADO wordmark, drawn to exactly
 *                                            the same geometry as
 *                                            splash-icon.png so the in-app
 *                                            screen and the system splash put
 *                                            the wordmark in the same place at
 *                                            the same size.
 *   scripts/assets/splash-pattern.svg        the SVG the PNG came from.
 *   scripts/assets/splash-preview.png        a small flattened preview with the
 *                                            wordmark on top, for eyeballing.
 *
 * WHY TWO FILES RATHER THAN ONE
 *
 * The pattern is shown with resizeMode="cover", which crops but never
 * stretches, so the icons keep their shape on any phone. The wordmark must
 * NOT be cropped or rescaled with it, so it is a separate image sized in dp.
 *
 * WHY A BROWSER
 *
 * Same reason as scripts/make-app-icons.mjs: the wordmark needs real Jost 600
 * and Node has no font renderer, and nothing should be shuttled through a chat
 * window as base64. This drives headless Chrome against the live site (which
 * already self-hosts Jost 600) and writes the PNGs straight to disk.
 *
 * The icon artwork is NOT duplicated here — it is read out of
 * apps/web/src/components/SplashPattern.tsx, which stays the one place the
 * eighteen glyphs are drawn.
 *
 * Usage:  node scripts/make-splash-pattern.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const OUT_DIR = join(REPO, "apps", "mobile", "assets");
const SRC_DIR = join(__dirname, "assets");
const PATTERN_SRC = join(REPO, "apps", "web", "src", "components", "SplashPattern.tsx");

const PERSIMMON = "#F94E33";
const CREAM = "#F6F1E7";
const SITE = "https://cado-web.vercel.app";
const PORT = 9334;

/** A tall portrait canvas. Phones run from 16:9 to 20:9; cover crops, never stretches. */
const W = 1242;
const H = 2688;
/** How many pixels one pattern cell occupies. 216 puts ~5.75 icons across a phone. */
const CELL_PX = 216;

// ---------------------------------------------------------------------------
// Read the artwork out of the component
// ---------------------------------------------------------------------------

const src = readFileSync(PATTERN_SRC, "utf8");

function num(name) {
  const m = src.match(new RegExp(`const ${name} = ([0-9.]+);`));
  if (!m) throw new Error(`could not find "const ${name} = ..." in SplashPattern.tsx`);
  return Number(m[1]);
}

function iconPaths() {
  const block = src.match(/const ICONS: string\[\] = \[([\s\S]*?)\n\];/);
  if (!block) throw new Error("could not find the ICONS array in SplashPattern.tsx");
  const out = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (out.length !== 18) throw new Error(`expected 18 icons, read ${out.length}`);
  return out;
}

const ICONS = iconPaths();
const CELL = num("CELL");
const ICON = num("ICON");
const STROKE = num("STROKE");
const OPACITY = num("OPACITY");
const COLS = num("COLS");
const ROWS = num("ROWS");
const STRIDE_ROW = num("STRIDE_ROW");
const STRIDE_COL = num("STRIDE_COL");

// ---------------------------------------------------------------------------
// Build the SVG
// ---------------------------------------------------------------------------

const S = CELL_PX / CELL;
const tileW = COLS * CELL * S;
const tileH = ROWS * CELL * S;

/** Same rule as cells() in SplashPattern.tsx — see the note there. */
function layout() {
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      out.push({
        x: (c * CELL + (r % 2 ? CELL / 2 : 0)) * S,
        y: r * CELL * S,
        i: (r * STRIDE_ROW + c * STRIDE_COL) % ICONS.length,
      });
    }
  }
  return out;
}

const cells = layout();

// Sanity: every glyph has to actually appear somewhere on the visible screen,
// not merely somewhere in a tile that is taller than the phone.
const visible = new Set(cells.filter((c) => c.y < H).map((c) => c.i));
if (visible.size !== ICONS.length) {
  throw new Error(`only ${visible.size} of ${ICONS.length} icons land on the screen`);
}

const glyphs = cells
  .map((c) => `<g transform="translate(${c.x.toFixed(2)} ${c.y.toFixed(2)}) scale(${(ICON * S / 24).toFixed(5)})"><path d="${ICONS[c.i]}"/></g>`)
  .join("");

/**
 * The clearing behind the wordmark is sized in pixels, not percentages: a
 * percentage radius on a 1242x2688 box is normalised against the diagonal and
 * comes out enormous, which would wipe the pattern off most of the screen.
 * The wordmark is ~640px wide here, so the pattern is gone inside a 344px
 * radius — a comfortable margin past the ends of the word — and back to full
 * strength by 820px.
 *
 * Mask stops are WHITE. A mask is read by luminance, so black stops evaluate
 * to zero everywhere and nothing renders at all.
 */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" gradientUnits="userSpaceOnUse" cx="${W / 2}" cy="${H * 0.42}" r="${H * 0.62}">
      <stop offset="0" stop-color="${PERSIMMON}"/>
      <stop offset="0.55" stop-color="#F5492F"/>
      <stop offset="1" stop-color="#E5432B"/>
    </radialGradient>
    <pattern id="tile" width="${tileW.toFixed(2)}" height="${tileH.toFixed(2)}" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="#FFFFFF" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round" opacity="${OPACITY}">${glyphs}</g>
    </pattern>
    <!-- A SHALLOW DIP, NOT A HOLE.

         This gradient used to start at stop-opacity 0 and was still only 0.12
         of the way back at 42% of the radius, which erased the entire middle
         of the screen. On a phone that is a large plain orange field with a
         few icons around the rim — and the middle is exactly where the eye
         lands, so it read as no pattern at all. It was reported as "no
         splash" twice while the pattern was present and working.

         NOTE FOR THE NEXT PERSON: this is NOT the same gradient as the one in
         SplashPattern.tsx. This script only reads CELL, ICON, STROKE and
         OPACITY out of that component — the mask lives here, and here only.
         Editing the component's radialGradient changes the web preview and
         has no effect whatsoever on the PNG the app ships. That cost two
         builds to find. -->
    <radialGradient id="clear" gradientUnits="userSpaceOnUse" cx="${W / 2}" cy="${H / 2}" r="820">
      <stop offset="0" stop-color="#FFF" stop-opacity="0.62"/>
      <stop offset="0.42" stop-color="#FFF" stop-opacity="0.78"/>
      <stop offset="0.75" stop-color="#FFF" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#FFF" stop-opacity="1"/>
    </radialGradient>
    <mask id="clearing"><rect width="${W}" height="${H}" fill="url(#clear)"/></mask>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#tile)" mask="url(#clearing)"/>
</svg>`;

mkdirSync(SRC_DIR, { recursive: true });
writeFileSync(join(SRC_DIR, "splash-pattern.svg"), SVG, "utf8");

// ---------------------------------------------------------------------------
// Drive the browser
// ---------------------------------------------------------------------------

const BROWSERS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

function launch(exe) {
  return spawn(exe, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + join(process.env.TEMP || ".", "cado-splash-profile"),
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

/** Minimal CDP client. One command per socket is all this needs. */
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

const svgB64 = Buffer.from(SVG, "utf8").toString("base64");

/** Rasterise the SVG. Chrome draws patterns and masks in an <img> correctly. */
const RASTER = `(async (b64, w, h) => {
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/png').split(',')[1];
})`;

/**
 * The wordmark, transparent, at exactly the geometry splash-icon.png uses so
 * the handover from the system splash to the in-app screen does not move it.
 * The centring uses the real bounding box, not the baseline — with the
 * baseline alone the wordmark sits visibly low.
 */
const WORDMARK = `(async (targetWidth) => {
  await document.fonts.ready;
  await document.fonts.load('600 300px \\"Jost\\"');
  if (!document.fonts.check('600 300px \\"Jost\\"')) throw new Error('Jost 600 did not load');
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const x = c.getContext('2d');
  x.letterSpacing = '14px';
  let size = 300;
  x.font = '600 ' + size + 'px "Jost", sans-serif';
  size = Math.floor(size * targetWidth / x.measureText('CADO').width);
  x.font = '600 ' + size + 'px "Jost", sans-serif';
  x.fillStyle = '${CREAM}';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const m = x.measureText('CADO');
  const yOff = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  x.fillText('CADO', S / 2 + 7, S / 2 + yOff);
  return c.toDataURL('image/png').split(',')[1];
})`;

/**
 * Flattened preview: the pattern with the wordmark laid on top at the size the
 * app renders it (200dp of a 390dp-wide screen), scaled down small enough to
 * open and look at.
 */
const PREVIEW = `(async (patB64, wordB64, w, h) => {
  const load = (b) => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = 'data:image/png;base64,' + b;
  });
  const [pat, word] = await Promise.all([load(patB64), load(wordB64)]);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  // cover: scale so the pattern fills the box, centred, cropped not stretched
  const k = Math.max(w / pat.width, h / pat.height);
  x.drawImage(pat, (w - pat.width * k) / 2, (h - pat.height * k) / 2, pat.width * k, pat.height * k);
  const wm = w * (200 / 390);
  x.drawImage(word, (w - wm) / 2, (h - wm) / 2, wm, wm);
  return c.toDataURL('image/png').split(',')[1];
})`;

/**
 * Proof the pattern is really there and really cleared in the middle: how many
 * pixels in a patch are lighter than the flat background. White at 13% over
 * persimmon lifts blue from 51 to about 77, so blue > 62 means "an icon line".
 */
const INK = `(async (b64, w, h) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const patch = (px, py, s) => {
    const d = x.getImageData(px, py, s, s).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 62) n++;
    return +(100 * n / (d.length / 4)).toFixed(2);
  };
  const S = 360;
  return {
    centre: patch((w - S) / 2, (h - S) / 2, S),
    topLeft: patch(40, 40, S),
    topRight: patch(w - S - 40, 40, S),
    bottomLeft: patch(40, h - S - 40, S),
    bottomRight: patch(w - S - 40, h - S - 40, S),
    leftEdge: patch(0, Math.round(h * 0.15), S),
    rightEdge: patch(w - S, Math.round(h * 0.15), S)
  };
})`;

const exe = BROWSERS.find((p) => existsSync(p));
if (!exe) {
  console.error("No Chrome or Edge found. Nothing was written.");
  process.exit(1);
}

console.log(`Using ${exe.split("\\").pop()}`);
console.log(`Pattern: ${ICONS.length} icons, ${COLS}x${ROWS} tile, cell ${CELL_PX}px, icon ${(ICON * S).toFixed(0)}px, stroke ${(STROKE * ICON * S / 24).toFixed(1)}px`);
const child = launch(exe);

try {
  const page = await waitForDevtools();
  const ws = page.webSocketDebuggerUrl;
  await new Promise((r) => setTimeout(r, 3000));

  mkdirSync(OUT_DIR, { recursive: true });

  process.stdout.write("  splash-pattern.png... ");
  const patB64 = await evaluate(ws, `${RASTER}('${svgB64}', ${W}, ${H})`);
  if (!patB64 || patB64.length < 1000) throw new Error("the page returned no image");
  writeFileSync(join(OUT_DIR, "splash-pattern.png"), Buffer.from(patB64, "base64"));
  console.log(`ok (${(Buffer.from(patB64, "base64").length / 1024).toFixed(0)} KB)`);

  process.stdout.write("  splash-wordmark.png... ");
  const wordB64 = await evaluate(ws, `${WORDMARK}(560)`);
  if (!wordB64 || wordB64.length < 1000) throw new Error("the page returned no wordmark");
  writeFileSync(join(OUT_DIR, "splash-wordmark.png"), Buffer.from(wordB64, "base64"));
  console.log(`ok (${(Buffer.from(wordB64, "base64").length / 1024).toFixed(0)} KB)`);

  // Three shapes, because "does it crop badly" is the question the pattern has
  // to answer: a tall 20:9 phone, the 19.5:9 the artwork is cut for, and a
  // short 16:9 one, which is the worst vertical crop it will ever see.
  for (const [name, w, h] of [["splash-preview.png", 414, 896], ["splash-preview-20x9.png", 414, 920], ["splash-preview-16x9.png", 414, 736]]) {
    process.stdout.write(`  ${name}... `);
    const prevB64 = await evaluate(ws, `${PREVIEW}('${patB64}', '${wordB64}', ${w}, ${h})`);
    writeFileSync(join(SRC_DIR, name), Buffer.from(prevB64, "base64"));
    console.log("ok");
  }

  process.stdout.write("  checking... ");
  const ink = await evaluate(ws, `${INK}('${patB64}', ${W}, ${H})`);
  console.log("");
  console.log("  % of pixels carrying an icon line, per 360px patch:");
  for (const [k, v] of Object.entries(ink)) console.log(`    ${k.padEnd(12)} ${v}%`);
  if (ink.centre > 0.4) console.warn("  WARNING: the middle is not clear enough for the wordmark.");
  if (ink.topLeft < 0.5) console.warn("  WARNING: the pattern looks empty. Check the mask stops are white.");
  const corners = [ink.topLeft, ink.topRight, ink.bottomLeft, ink.bottomRight, ink.leftEdge, ink.rightEdge];
  const spread = Math.max(...corners) / Math.min(...corners);
  console.log(`  corner-to-corner density spread: ${spread.toFixed(2)}x (a seam or a gap would push this up)`);

  console.log(`\nWritten to ${OUT_DIR}`);
  console.log(`SVG and preview in ${SRC_DIR}`);
} finally {
  child.kill();
}
