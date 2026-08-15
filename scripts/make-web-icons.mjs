/**
 * Renders the WEBSITE's icon set: Persimmon face, cream CADO wordmark.
 *
 * Sibling of make-app-icons.mjs, which does the same for the Android app —
 * read the WHY A BROWSER note there. Short version: the wordmark must be set
 * in real Jost 600 and only a browser can render that, so this drives
 * headless Chrome against the live site (which self-hosts the font) and
 * writes each PNG straight to disk.
 *
 * These files REPLACE the old branding in apps/web/public:
 *   - favicon.svg / favicon.png were a PURPLE ARROW left over from a template
 *   - brand/logo-icon*.png were the retired gift-box-and-bow mark
 * Marwan's report: "first press of Shop Now flashes the old black splash with
 * the old arc logo". The splash itself is already deleted; these icons are
 * the last places the old marks could appear (tab icon, home-screen icon,
 * share preview).
 *
 * Sizes: 16/32/48 favicons, 180 apple-touch, 192/512 for the web manifest so
 * Chrome's "Add to Home screen" gets crisp icons at both densities.
 *
 * Usage:  node scripts/make-web-icons.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "apps", "web", "public", "brand");

const PERSIMMON = "#F94E33";
const CREAM = "#F6F1E7";
const SITE = "https://cado-web.vercel.app";

const BROWSERS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const PORT = 9334;

/**
 * Same drawing as the app icon, but size-aware: at 16 and 32px a wordmark
 * with letterspacing is an unreadable smear, so the small sizes draw a single
 * bold "C" instead — the same trade every wordmark brand makes for its
 * favicon. From 48px up there is room for the full word.
 */
const DRAW = `(async (size, targetRatio, text, letterSpacing) => {
  await document.fonts.ready;
  await document.fonts.load('600 300px \\"Jost\\"');
  if (!document.fonts.check('600 300px \\"Jost\\"')) throw new Error('Jost 600 did not load');
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = '${PERSIMMON}';
  x.fillRect(0, 0, size, size);
  x.letterSpacing = letterSpacing;
  let px = size;
  x.font = '600 ' + px + 'px "Jost", sans-serif';
  px = px * (size * targetRatio) / x.measureText(text).width;
  x.font = '600 ' + px + 'px "Jost", sans-serif';
  x.fillStyle = '${CREAM}';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const m = x.measureText(text);
  const yOff = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  x.fillText(text, size / 2 + (letterSpacing === '0px' ? 0 : size * 0.007), size / 2 + yOff);
  return c.toDataURL('image/png').split(',')[1];
})`;

function launch(exe) {
  return spawn(exe, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + join(process.env.TEMP || ".", "cado-web-icon-profile"),
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
    setTimeout(() => rej(new Error("timed out waiting for the page")), 60000);
  });
  ws.close();
  return result;
}

const exe = BROWSERS.find((p) => existsSync(p));
if (!exe) {
  console.error("No Chrome or Edge found. Nothing was written.");
  process.exit(1);
}

console.log(`Using ${exe.split("\\").pop()}`);
const child = launch(exe);

try {
  const page = await waitForDevtools();
  await new Promise((r) => setTimeout(r, 3000));

  mkdirSync(OUT_DIR, { recursive: true });

  // Below 48px the full wordmark is unreadable, so those draw the C monogram.
  const jobs = [
    { file: "icon-16.png", size: 16, text: "C", ratio: 0.62, spacing: "0px" },
    { file: "icon-32.png", size: 32, text: "C", ratio: 0.62, spacing: "0px" },
    { file: "icon-48.png", size: 48, text: "CADO", ratio: 0.78, spacing: "1px" },
    { file: "icon-180.png", size: 180, text: "CADO", ratio: 0.72, spacing: "3px" },
    { file: "icon-192.png", size: 192, text: "CADO", ratio: 0.72, spacing: "3px" },
    { file: "icon-512.png", size: 512, text: "CADO", ratio: 0.68, spacing: "8px" },
  ];

  for (const job of jobs) {
    process.stdout.write(`  ${job.file}... `);
    const b64 = await evaluate(
      page.webSocketDebuggerUrl,
      `${DRAW}(${job.size}, ${job.ratio}, '${job.text}', '${job.spacing}')`
    );
    if (!b64 || b64.length < 100) throw new Error("the page returned no image");
    const buf = Buffer.from(b64, "base64");
    writeFileSync(join(OUT_DIR, job.file), buf);
    console.log(`ok (${(buf.length / 1024).toFixed(1)} KB)`);
  }

  console.log(`\nWritten to ${OUT_DIR}`);
} finally {
  child.kill();
}
